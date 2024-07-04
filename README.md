# Assistino

A TypeScript wrapper for the OpenAI Assistants API with multi-user support and cost optimization.

## Installation

```bash
npm install assistino
```

## Usage

```typescript
import Assistant from 'assistino';

const apiKey = 'YOUR_API_KEY_HERE';
const assistantId = 'YOUR_ASSISTANT_ID_HERE';

const assist = new Assistant(apiKey, assistantId, 'gpt-3.5-turbo', {
  maxMessagesPerThread: 20,
  inactivityTimeout: 60 * 60 * 1000 // 1 hour
});

async function chatExample() {
  try {
    const userId = 'user123';
    const response = await assist.chat("Hello, how are you?", userId);
    console.log("Assistant's response:", response);

    // Cleanup inactive threads (call this periodically)
   // await assist.cleanupInactiveThreads();
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

chatExample();
```
## Configuration

When creating an instance of the Assistant class, you can provide the following options:

- `apiKey`: Your OpenAI API key
- `assistantId`: The ID of your OpenAI Assistant
- `model` (optional): The GPT model to use (default: 'gpt-3.5-turbo')
- `options` (optional): An object with the following properties:
  - `maxMessagesPerThread`: Maximum number of messages to retain per thread
  - `inactivityTimeout`: Time in milliseconds after which an inactive thread is cleaned up

## Methods

- `chat(message, userId)`: Send a message and get a response
- `removeUserThread(userId)`: Manually remove a user's conversation thread
- `cleanupInactiveThreads()`: Remove all inactive threads

## Best Practices

- Call `cleanupInactiveThreads()` periodically to manage long-running applications
- Adjust `maxMessagesPerThread` and `inactivityTimeout` based on your specific use case and budget constraints

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! 