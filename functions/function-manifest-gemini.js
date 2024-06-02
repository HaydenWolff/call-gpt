// create metadata for all the available functions to pass to completions API
const tools = [
  {
    "function_declations": [
      {
        name: 'checkInventory',
        description: 'Check the inventory of airpods, airpods pro or airpods max.',
        parameters: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              'enum': ['airpods', 'airpods pro', 'airpods max'],
              description: 'The model of airpods, either the airpods, airpods pro or airpods max',
            },
          },
          required: ['model'],
        }
      },
      {
        name: 'checkPrice',
        description: 'Check the price of given model of airpods, airpods pro or airpods max.',
        parameters: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              'enum': ['airpods', 'airpods pro', 'airpods max'],
              description: 'The model of airpods, either the airpods, airpods pro or airpods max',
            },
          },
          required: ['model'],
        }
      },
      {
        name: 'placeOrder',
        description: 'Places an order for a set of airpods.',
        parameters: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              'enum': ['airpods', 'airpods pro'],
              description: 'The model of airpods, either the regular or pro',
            },
            quantity: {
              type: 'integer',
              description: 'The number of airpods they want to order',
            },
          },
          required: ['type', 'quantity'],
        }
      },
      {
        name: 'transferCall',
        description: 'Transfers the customer to a live agent in case they request help from a real person.',
        parameters: {
          type: 'object',
          properties: {
            callSid: {
              type: 'string',
              description: 'The unique identifier for the active phone call.',
            },
          },
          required: ['callSid'],
        }
      },
    ],
  }
];

module.exports = tools;