import protobufDefinitons from './protobuf-def.json'

// Ensure that this function runs after generating TxTypes
export function generateMessagesOptions(txTypes: Record<string, string>): Record<string, string> {
  return protobufDefinitons.file.reduce((acc, file) => {
    const messages = file.messageType
    if (messages && messages.length > 0) {
      messages.forEach((message: any) => {
        const messageName = message.name
        if (txTypes[messageName] && Object.keys(message.options ?? {}).length) {
          acc[messageName] = {
            ...message.options,
          }
        }
      })
    }
    return acc
  }, {} as Record<string, string>)
}


