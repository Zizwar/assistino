const Assistant = require('assistino');

async function main() {
  const apiKey = '';
  const assistantId = '';
  const assist = new Assistant(apiKey, assistantId, 'gpt-3.5-turbo-0125', {
    maxMessagesPerThread: 20,
    inactivityTimeout: 60 * 60 * 1000 
  });

  try {
    const user1Id = 'user2';
    let response = await assist.chat("manzakina za", user1Id);
    console.log("res for user2:", response);

    //await assist.cleanupInactiveThreads();
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
