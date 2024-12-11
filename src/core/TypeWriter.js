export class TypeWriter {
  constructor(baseDelay = 15, minDelay = 2) {
    this.baseDelay = baseDelay;
    this.minDelay = minDelay;
  }

  async typeText(input, text) {
    const speedFactor = Math.max(1, Math.floor(text.length / 100));
    const getTypingDelay = () => Math.max(this.minDelay, (this.baseDelay - speedFactor) + (Math.random() * 5));

    input.value = '';
    const chunks = text.split(/([.,!?])/);
    
    for (const chunk of chunks) {
      if (!chunk) continue;
      for (const char of chunk) {
        input.value += char;
        await new Promise(resolve => setTimeout(resolve, getTypingDelay()));
      }
      if (/[.,!?]/.test(chunk)) {
        await new Promise(resolve => setTimeout(resolve, Math.max(20, 100 - speedFactor * 5)));
      }
    }
  }
}
