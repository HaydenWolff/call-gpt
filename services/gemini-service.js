require('colors');
const EventEmitter = require('events');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const tools = require('../functions/function-manifest-gemini');
const apiKey = process.env.GEMINI_API_KEY;

// Import all functions included in function manifest
// Note: the function name and file name must be the same
const availableFunctions = {};
tools[0]["function_declations"].forEach((tool) => {
  let functionName = tool.name;
  availableFunctions[functionName] = require(`../functions/${functionName}`);
});
console.log(availableFunctions);

class GeminiGPTService extends EventEmitter {
  constructor() {
    super();
    this.gemini = new GoogleGenerativeAI(apiKey);
    this.userContext = [
      { 'role': 'user', 'parts': [{ "text": '' }] },
      { 'role': 'model', 'parts': [{ "text": 'Hello! I understand you\'re looking for a pair of AirPods, is that correct?' }] },
    ],
    this.partialResponseIndex = 0;
  }

  // Add the callSid to the chat context in case
  // ChatGPT decides to transfer the call.
  setCallSid (callSid) {
    this.userContext.push({ 'role': 'model', 'parts': [{ "text": `callSid: ${callSid}` }] });
  }

  validateFunctionArgs (args) {
    try {
      return JSON.parse(args);
    } catch (error) {
      console.log('Warning: Double function arguments returned by OpenAI:', args);
      // Seeing an error where sometimes we have two sets of args
      if (args.indexOf('{') != args.lastIndexOf('{')) {
        return JSON.parse(args.substring(args.indexOf(''), args.indexOf('}') + 1));
      }
    }
  }

  updateUserContext(name, role, text) {
    if (role == 'function') {
    //   this.userContext.push({ 'role': role, 'name': name, 'parts': [{ "text": text }] });
        if (name in availableFunctions) {
          this.userContext.push({ 'role': role, 'parts': [{ "function_call": {"name": name} }] });
          this.userContext.push({ 'role': role, 'parts': [{"function_response": {name: name, "response": {"content": text}}}]});
        }
    } else {
        this.userContext.push({ 'role': role, 'parts': [{ "text": text }] });
    }
  }

  async completion(text, interactionCount, role = 'user', name = 'user') {
    this.updateUserContext(name, role, text);
    // Step 1: Send user transcription to Gemini with function calls
    const model = this.gemini.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        tools: {
            functionDeclarations: tools[0]["function_declations"]
        },
        systemInstruction: 'You are an outbound sales representative selling Apple Airpods. You have a youthful and cheery personality. Keep your responses as brief as possible but make every attempt to keep the caller on the phone without being rude. Don\'t ask more than 1 question at a time. Don\'t make assumptions about what values to plug into functions. Ask for clarification if a user request is ambiguous. Speak out all prices to include the currency. Please help them decide between the airpods, airpods pro and airpods max by asking questions like \'Do you prefer headphones that go in your ear or over the ear?\'. If they are trying to choose between the airpods and airpods pro try asking them if they need noise canceling. Once you know which model they would like ask them how many they would like to purchase and try to get them to place an order. •' 
    });
    const chat = model.startChat({ 
        history: this.userContext,
        generationConfig: {
          temperature: 0.7, // Adjust temperature for desired response style (0.0 - 1.0)
          maxOutputTokens: 150, // Adjust maxTokens for response length
        },
        tools: {
            functionDeclarations: tools[0]["function_declations"]
        },
     });

    const result = await chat.sendMessageStream(text);
    // const result = await chat.sendMessage(text);
    // const response = await result.response;
    // const messageText = response.text();
    // let content = messageText;
    // let functionCall = response.functionCalls();

    let completeResponse = '';
    let partialResponse = '';

    // if (functionCall) {
    //     let functionResponse = await availableFunctions[functionCall[0].name](functionCall[0].args);
    //     await this.completion(functionResponse, interactionCount, 'function', functionCall[0].name);
    // } else {

    for await (const chunk of result.stream) {
      let content = chunk.text() || '';
      console.log(chunk.candidates[0].content.parts[0]);
      console.log('function call',chunk.functionCalls());

      // Step 2: Check if Gemini wants to call a function
      if (chunk.text() == "KEKOEFKEOF") {
        const functionName = chunk.functionCalls[0].function;
        const functionArgs = this.validateFunctionArgs(chunk.functionCalls[0].arguments);

        // Call the function on behalf of Gemini
        const functionToCall = availableFunctions[functionName];
        let functionResponse = await functionToCall(functionArgs);

        // Update user context with function response
        this.updateUserContext(functionName, 'function', functionResponse);

        // Continue conversation with function response
        await this.completion(functionResponse, interactionCount, 'function', functionName);
      } else {
        // Continue conversation without function call
        completeResponse += content;
        partialResponse += content;

        const gptReply = { 
            partialResponseIndex: this.partialResponseIndex,
            partialResponse
          };

          this.emit('gptreply', gptReply, interactionCount);
          this.partialResponseIndex++;
          partialResponse = '';
        }
    }
    // completeResponse += content;
    // partialResponse += content;

    // const gptReply = { 
    //     partialResponseIndex: this.partialResponseIndex,
    //     partialResponse
    //     };

    // this.emit('gptreply', gptReply, interactionCount);
    // this.partialResponseIndex++;
    // partialResponse = '';
    // }
    this.userContext.push({'role': 'model', 'parts': [{'text': completeResponse}]});
    console.log(`GPT -> user context length: ${this.userContext.length}`.green);
  }
}

module.exports = { GeminiGPTService };
