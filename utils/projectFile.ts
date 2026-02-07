/**
 * Project File Save/Load Utilities
 * 
 * This module provides functionality to export and import Motion Labs projects
 * as portable .motionlabs files that can be opened on any device.
 * 
 * File Format: JSON with embedded base64-encoded media assets
 * Extension: .motionlabs
 */

import { EditorElement, Track, Marker } from "../types";
import { getAssets, getAssetById, saveAsset, MediaAsset } from "./db";

// Version for future compatibility
const PROJECT_FILE_VERSION = 1;

/**
 * Structure of the exported project file
 * Contains all project data including embedded media assets
 */
export interface ProjectFile {
    version: number;
    name: string;
    createdAt: number;
    elements: EditorElement[];
    tracks: Track[];
    markers: Marker[];
    // Media assets stored as base64 for portability
    assets: EmbeddedAsset[];
}

/**
 * Embedded asset structure for portable storage
 * Media files are converted to base64 strings for embedding in the project file
 */
interface EmbeddedAsset {
    id: string;
    name: string;
    type: string; // ElementType as string
    mimeType: string;
    data: string; // base64 encoded blob
    createdAt: number;
}

/**
 * Convert a Blob to a base64 string
 * Used for embedding media assets in the project file
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove the data URL prefix (e.g., "data:video/mp4;base64,")
            const result = reader.result as string;
            resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Convert a base64 data URL back to a Blob
 * Used when importing project files
 */
const base64ToBlob = (dataUrl: string): Blob => {
    // Parse the data URL
    const [header, base64Data] = dataUrl.split(',');
    const mimeMatch = header.match(/data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

    // Decode base64
    const byteString = atob(base64Data);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
    }

    return new Blob([uint8Array], { type: mimeType });
};

/**
 * Export the current project to a downloadable .motionlabs file
 * 
 * This function:
 * 1. Collects all elements, tracks, and markers
 * 2. Gathers all referenced media assets
 * 3. Converts media blobs to base64 for embedding
 * 4. Creates a JSON file and triggers download
 * 
 * @param elements - Current timeline elements
 * @param tracks - Current tracks configuration
 * @param markers - Timeline markers
 * @param projectName - Optional name for the project file
 */
export const saveProjectToFile = async (
    elements: EditorElement[],
    tracks: Track[],
    markers: Marker[],
    projectName: string = 'motion-labs-project'
): Promise<void> => {
    try {
        // Get all assets from IndexedDB
        const allAssets = await getAssets();

        // Find which assets are actually used in the project
        const usedAssetIds = new Set(
            elements
                .filter(el => el.assetId)
                .map(el => el.assetId as string)
        );

        // Only embed assets that are referenced by elements
        const usedAssets = allAssets.filter(asset => usedAssetIds.has(asset.id));

        // Convert assets to embedded format with base64 data
        const embeddedAssets: EmbeddedAsset[] = await Promise.all(
            usedAssets.map(async (asset) => ({
                id: asset.id,
                name: asset.name,
                type: asset.type,
                mimeType: asset.blob.type,
                data: await blobToBase64(asset.blob),
                createdAt: asset.createdAt
            }))
        );

        // Clean elements: remove blob URLs (they'll be regenerated on import)
        const cleanElements = elements.map(el => {
            if (el.props.src?.startsWith('blob:')) {
                const { src, ...restProps } = el.props;
                return { ...el, props: restProps };
            }
            return el;
        });

        // Create the project file structure
        const projectFile: ProjectFile = {
            version: PROJECT_FILE_VERSION,
            name: projectName,
            createdAt: Date.now(),
            elements: cleanElements,
            tracks,
            markers,
            assets: embeddedAssets
        };

        // Convert to JSON string
        const jsonString = JSON.stringify(projectFile, null, 2);

        // Create blob and trigger download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${projectName}-${Date.now()}.motionlabs`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the URL
        URL.revokeObjectURL(url);

        console.log(`Project saved: ${projectName} with ${embeddedAssets.length} assets`);
    } catch (error) {
        console.error('Failed to save project:', error);
        throw new Error('Failed to save project file');
    }
};

/**
 * Load a project from a .motionlabs file
 * 
 * This function:
 * 1. Parses the JSON file
 * 2. Extracts embedded media assets
 * 3. Saves assets to IndexedDB
 * 4. Regenerates blob URLs for media elements
 * 5. Returns the restored project state
 * 
 * @param file - The .motionlabs file to load
 * @returns The restored project state including elements, tracks, and markers
 */
export const loadProjectFromFile = async (
    file: File
): Promise<{
    elements: EditorElement[];
    tracks: Track[];
    markers: Marker[];
}> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const content = event.target?.result as string;
                const projectFile: ProjectFile = JSON.parse(content);

                // Validate version
                if (!projectFile.version || projectFile.version > PROJECT_FILE_VERSION) {
                    throw new Error('Unsupported project file version');
                }

                // Create a mapping from old asset IDs to new ones
                // (in case we need to avoid collisions)
                const assetIdMap = new Map<string, string>();

                // Import assets to IndexedDB
                for (const embeddedAsset of projectFile.assets) {
                    // Convert base64 back to blob
                    const blob = base64ToBlob(embeddedAsset.data);

                    // Save to IndexedDB (will get a new ID)
                    const savedAsset = await saveAsset(blob, embeddedAsset.type as any, embeddedAsset.name);

                    // Map old ID to new ID
                    assetIdMap.set(embeddedAsset.id, savedAsset.id);
                }

                // Update elements with new asset IDs and generate blob URLs
                const restoredElements = await Promise.all(
                    projectFile.elements.map(async (el) => {
                        if (el.assetId) {
                            const newAssetId = assetIdMap.get(el.assetId);
                            if (newAssetId) {
                                const asset = await getAssetById(newAssetId);
                                if (asset) {
                                    return {
                                        ...el,
                                        assetId: newAssetId,
                                        props: {
                                            ...el.props,
                                            src: URL.createObjectURL(asset.blob)
                                        }
                                    };
                                }
                            }
                        }
                        return el;
                    })
                );

                console.log(`Project loaded: ${projectFile.name} with ${projectFile.assets.length} assets`);

                resolve({
                    elements: restoredElements,
                    tracks: projectFile.tracks,
                    markers: projectFile.markers || []
                });
            } catch (error) {
                console.error('Failed to parse project file:', error);
                reject(new Error('Invalid project file format'));
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read project file'));
        };

        reader.readAsText(file);
    });
};

/**
 * Trigger a file picker to select a .motionlabs file for import
 * 
 * @returns Promise that resolves with the loaded project data
 */
export const openProjectFilePicker = (): Promise<{
    elements: EditorElement[];
    tracks: Track[];
    markers: Marker[];
} | null> => {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.motionlabs,application/json';

        input.onchange = async (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                try {
                    const projectData = await loadProjectFromFile(file);
                    resolve(projectData);
                } catch (error) {
                    console.error('Failed to load project:', error);
                    alert('Failed to load project file. Please ensure it is a valid .motionlabs file.');
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        };

        input.oncancel = () => {
            resolve(null);
        };

        // Trigger file picker
        input.click();
    });
};
