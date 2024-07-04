import OpenAI from 'openai';

interface AssistantOptions {
  maxMessagesPerThread?: number;
  inactivityTimeout?: number;
}

class Assistant {
  private openai: OpenAI;
  private assistantId: string;
  private model: string;
  private threads: Map<string, string>;
  private lastActivity: Map<string, number>;
  private options: Required<AssistantOptions>;

  constructor(apiKey: string, assistantId: string, model: string = 'gpt-3.5-turbo', options: AssistantOptions = {}) {
    this.openai = new OpenAI({ apiKey });
    this.assistantId = assistantId;
    this.model = model;
    this.threads = new Map();
    this.lastActivity = new Map();
    this.options = {
      maxMessagesPerThread: options.maxMessagesPerThread || 10,
      inactivityTimeout: options.inactivityTimeout || 30 * 60 * 1000, // 30 minutes default
    };
  }

  async chat(message: string, userId?: string): Promise<string> {
    try {
      let threadId: string;

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

      const lastMessage:any = messages.data
        .filter(message => message.role === 'assistant')
        .pop();

      return lastMessage ? lastMessage.content[0].text.value : "No response found.";
    } catch (error) {
      console.error("An error occurred:", error);
      throw error;
    }
  }


  async getOrCreateThread(userId: string) {
    if (this.threads.has(userId)) {
      const threadId :any = this.threads.get(userId);
      const lastActivityTime:any  = this.lastActivity.get(threadId);

      if (Date.now() - lastActivityTime > this.options.inactivityTimeout) {
        await this.removeUserThread(userId);
        return await this.createNewThread(userId);
      }

      return threadId;
    } else {
      return await this.createNewThread(userId);
    }
  }

  async createNewThread(userId: string) {
    const newThread = await this.openai.beta.threads.create();
    this.threads.set(userId, newThread.id);
    this.lastActivity.set(newThread.id, Date.now());
    return newThread.id;
  }

  async removeUserThread(userId: string) {
    const threadId = this.threads.get(userId);
    if (threadId) {
      this.threads.delete(userId);
      this.lastActivity.delete(threadId);
       await this.openai.beta.threads.del(threadId);
    }
  }

  async cleanupOldMessages(threadId: string) {
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
      const lastActivityTime:any = this.lastActivity.get(threadId);
      if (now - lastActivityTime > this.options.inactivityTimeout) {
        await this.removeUserThread(userId);
      }
    }
  }
}

module.exports = Assistant;