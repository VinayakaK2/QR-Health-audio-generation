const faceAuthService = {
    /**
     * Enrolls a face by returning the descriptor.
     * In a real scenario, this might involve calling an external API or processing an image.
     * Here we simply return the descriptor provided by the client.
     * @param {Array<number>} descriptor - The face descriptor from client
     * @returns {Promise<Array<number>>} - The processed descriptor
     */
    enrollFace: async (descriptor) => {
        if (!descriptor || !Array.isArray(descriptor) || descriptor.length === 0) {
            throw new Error('Invalid face descriptor');
        }
        return descriptor;
    },

    /**
     * Verifies a face against a stored template.
     * Uses Euclidean distance to compare descriptors.
     * @param {Array<number>} storedDescriptor - The stored face descriptor
     * @param {Array<number>} loginDescriptor - The descriptor provided during login
     * @param {number} threshold - Distance threshold for a match (default 0.6)
     * @returns {Promise<boolean>} - True if match, false otherwise
     */
    verifyFace: async (storedDescriptor, loginDescriptor, threshold = 0.6) => {
        if (!storedDescriptor || !loginDescriptor) {
            throw new Error('Missing descriptors for verification');
        }

        if (storedDescriptor.length !== loginDescriptor.length) {
            throw new Error('Descriptor length mismatch');
        }

        // Calculate Euclidean distance
        const distance = Math.sqrt(
            storedDescriptor.reduce((sum, val, i) => sum + Math.pow(val - loginDescriptor[i], 2), 0)
        );

        return distance < threshold;
    }
};

module.exports = faceAuthService;
