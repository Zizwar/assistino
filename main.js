const OpenAI = require('openai');

class Assistant {
  constructor(apiKey, assistantId, model = 'gpt-3.5-turbo', options = {}) {
    this.openai = new OpenAI({ apiKey });
    this.assistantId = assistantId;
    this.model = model;
    this.threads = new Map();
    this.lastActivity = new Map();
    this.options = {
      maxMessagesPerThread: options.maxMessagesPerThread || 10,
      inactivityTimeout: options.inactivityTimeout || 30 * 60 * 1000, 
    };
  }

  async chat(message, userId = null) {
    try {
      let threadId;

      if (userId) {
        threadId = await this.getOrCreateThread(userId);
      } else {
        const newThread = await this.openai.beta.threads.create();
        threadId = newThread.id;
      }

      this.lastActivity.set(threadId, Date.now());

      await this.openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: message
      });

      await this.cleanupOldMessages(threadId);

      const run = await this.openai.beta.threads.runs.create(threadId, {
        assistant_id: this.assistantId,
        model: this.model
      });

      let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      while (runStatus.status !== 'completed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      }

      const messages = await this.openai.beta.threads.messages.list(threadId);

      const lastMessage = messages.data
        .filter(message => message.role === 'assistant')
        .pop();

      return lastMessage ? lastMessage.content[0].text.value : "لم يتم العثور على رد.";
    } catch (error) {
      console.error("حدث خطأ:", error);
      throw error;
    }
  }

  async getOrCreateThread(userId) {
    if (this.threads.has(userId)) {
      const threadId = this.threads.get(userId);
      const lastActivityTime = this.lastActivity.get(threadId);

      if (Date.now() - lastActivityTime > this.options.inactivityTimeout) {
        await this.removeUserThread(userId);
        return await this.createNewThread(userId);
      }

      return threadId;
    } else {
      return await this.createNewThread(userId);
    }
  }

  async createNewThread(userId) {
    const newThread = await this.openai.beta.threads.create();
    this.threads.set(userId, newThread.id);
    this.lastActivity.set(newThread.id, Date.now());
    return newThread.id;
  }

  async removeUserThread(userId) {
    const threadId = this.threads.get(userId);
    if (threadId) {
      this.threads.delete(userId);
      this.lastActivity.delete(threadId);
       await this.openai.beta.threads.del(threadId);
    }
  }

  async cleanupOldMessages(threadId) {
    const messages = await this.openai.beta.threads.messages.list(threadId);
    if (messages.data.length > this.options.maxMessagesPerThread) {
      const messagesToDelete = messages.data.slice(this.options.maxMessagesPerThread);
      for (const message of messagesToDelete) {
        await this.openai.beta.threads.messages.del(threadId, message.id);
      }
    }
  }

  async cleanupInactiveThreads() {
    const now = Date.now();
    for (const [userId, threadId] of this.threads.entries()) {
      const lastActivityTime = this.lastActivity.get(threadId);
      if (now - lastActivityTime > this.options.inactivityTimeout) {
        await this.removeUserThread(userId);
      }
    }
  }
}

module.exports = Assistant;