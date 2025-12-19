export class AudioQueue {
    constructor(speakFunction) {
        this.queue = [];
        this.worker = speakFunction;
        this.isProcessing = false;
    }

    // Changed to accept just "text"
    enqueue(text) {
        this.queue.push(text);
        this.processNext();
    }

    async processNext() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const text = this.queue.shift();

        try {
            // Worker is now head.speakText(text)
            await this.worker(text);
        } catch (error) {
            console.error("Queue Error:", error);
        } finally {
            this.isProcessing = false;
            this.processNext();
        }
    }
}