import { StdSignDoc } from "@cosmjs/amino";
import { AminoMsg } from "@cosmjs/amino/build";
import { AminoTypesMap } from "@demex-sdk/amino-types";
import { EIP712Types } from "@demex-sdk/codecs";
import { capitalize } from "@demex-sdk/core";

export interface TypedDataField {
  name: string;
  type: string;
}

export interface TypedDataDomain {
  name?: string;
  version?: string;
  chainId: string;
  verifyingContract?: string;
  salt?: string;
}

export interface EIP712Tx {
  readonly types: Record<string, TypedDataField[]>;
  readonly primaryType: string;
  readonly domain: TypedDataDomain;
  readonly message: any;
}

export const DEFAULT_EIP712_TYPES = {
  Coin: [
    {
      name: 'denom',
      type: 'string',
    },
    {
      name: 'amount',
      type: 'string',
    },
  ],
  EIP712Domain: [
    {
      name: 'name',
      type: 'string',
    },
    {
      name: 'version',
      type: 'string',
    },
    {
      name: 'chainId',
      type: 'uint256',
    },
    {
      name: 'verifyingContract',
      type: 'string',
    },
    {
      name: 'salt',
      type: 'string',
    },
  ],
  Fee: [
    {
      name: 'amount',
      type: 'Coin[]',
    },
    {
      name: 'gas',
      type: 'string',
    },
  ],
  Tx: [
    {
      name: 'account_number',
      type: 'string',
    },
    {
      name: 'chain_id',
      type: 'string',
    },
    {
      name: 'fee',
      type: 'Fee',
    },
    {
      name: 'memo',
      type: 'string',
    },
    {
      name: 'sequence',
      type: 'string',
    },
  ],

}

// Note that the chainId field is delibrately omitted because it is dynamic
export const DEFAULT_CARBON_DOMAIN_FIELDS = {
  name: 'Carbon',
  version: '1.0.0',
  verifyingContract: '0x0000000000000000000000000000636f736D6F73',
  salt: '1',
}


function getTypes(msgs: readonly AminoMsg[]): Record<string, TypedDataField[]> {
  let types: Record<string, TypedDataField[]> = { ...DEFAULT_EIP712_TYPES }
  const includedTypes: string[] = []
  let valueIndex = 0
  msgs.forEach((msg: AminoMsg, index: number) => {
    const typeUrl = AminoTypesMap.fromAmino(msg).typeUrl
    const msgType = msg.type.split('/')[1]
    const msgTypeIndex = getLatestMsgTypeIndex(`Type${msgType}`, types)
    //cosmos-sdk/MsgSend => TypeMsgSend1
    const typeKey = `Type${msgType}${msgTypeIndex}`
    if (!includedTypes.includes(msg.type)) {
      types['Tx'] = [...(types['Tx'] || []), { name: `msg${index}`, type: typeKey }]
      types[typeKey] = [{ name: 'value', type: `TypeValue${valueIndex}` }, { name: 'type', type: 'string' }]
      //cosmos-sdk/MsgSend => Msg_Send
      types = { ...types, ...sortByNameDescending(getMsgValueType(typeUrl, msg.value, `TypeValue${valueIndex}`, valueIndex, types)) }
      includedTypes.push(msg.type)
      valueIndex++
      return
    }
    const typeFound = matchingType(msg, types)
    if (typeFound) {
      types['Tx'] = [...(types['Tx'] || []), { name: `msg${index}`, type: typeFound }]
      return
    }
    //same type, but different fields populated, so new type defnition is required
    types['Tx'] = [...(types['Tx'] || []), { name: `msg${index}`, type: typeKey }]
    types[typeKey] = [{ name: 'value', type: `TypeValue${valueIndex}` }, { name: 'type', type: 'string' }]
    types = { ...types, ...sortByNameDescending(getMsgValueType(typeUrl, msg.value, `TypeValue${valueIndex}`, valueIndex, types)) }
    valueIndex++

  })

  return types
}

function getLatestMsgTypeIndex(typeName: string, types: Record<string, TypedDataField[]>): number {
  let index = 0;
  Object.entries(types).forEach(([key, _]) => {

    if (key.includes(typeName)) {
      index++

    }
  });

  return index
}
function sortByNameDescending(types: Record<string, TypedDataField[]>): Record<string, TypedDataField[]> {
  Object.entries(types).forEach(([key, _]) => {
    types[key]?.sort((a, b) => b.name.localeCompare(a.name));
  });
  return types

}

// Checks if there is a need to create new type for the same message type because of different populated fields 
function matchingType(msg: AminoMsg, eipTypes: Record<string, TypedDataField[]>): string {
  const msgType = msg.type.split('/')[1]
  let match = false

  for (const key in eipTypes) {
    if (msgType && key.includes(msgType)) {
      match = compareValues(msg, key, eipTypes)
    }
    if (match) {
      return key
    }
  }
  return ''
}

function compareValues(msg: any, key: string, eipTypes: Record<string, TypedDataField[]>): boolean {
  let match = true
  const fields = eipTypes[key] ?? []
  for (let { name, type } of fields) {
    if (Object.keys(msg).length > fields.length) {
      return false
    }
    let value = msg[name]
    if (!isNonZeroField(value)) {
      return false
    }
    const typeIsArray = type.includes('[]')
    if (typeIsArray) {
      type = type.split('[]')[0] ?? ''
      //Assumption: Take first value in array to determine which fields are populated
      value = value[0]
    }
    if (eipTypes[type]) {
      match = compareValues(value, type, eipTypes)
    }
  }
  return match
}

function getMsgValueType(msgTypeUrl: string, msgValue: any, msgTypeName: string, msgTypeIndex: number, types: Record<string, TypedDataField[]>, objectName?: string, nestedType: boolean = false, msgTypeDefinitions: Record<string, TypedDataField[]> = {}): Record<string, TypedDataField[]> {
  const packageName = msgTypeUrl.split(".").slice(0, -1).join(".")
  const msgFieldType = msgTypeUrl.split(".").pop()!
  const typeName = getTypeName(msgTypeName, msgTypeIndex, objectName, nestedType, false)
  const fieldsDefinition = EIP712Types[packageName][msgFieldType]
  if (isNonZeroField(msgValue)) {
    if (!msgTypeDefinitions[typeName]) {
      msgTypeDefinitions[typeName] = [];
    }
    fieldsDefinition.forEach(({ packageName, name, type }: any) => {
      const fieldValue = Array.isArray(msgValue) && msgValue.length > 0 ? msgValue[0][name] : msgValue[name]
      //Assumption: Take first value in array to determine which fields are populated
      if (isNonZeroField(fieldValue)) {
        if (Array.isArray(fieldValue) && fieldValue.length === 0) {
          msgTypeDefinitions[typeName] = [...(msgTypeDefinitions[typeName] || []), { name, type: 'string[]' }]
          return
        }
        //For nested structs
        if (packageName) {
          const isArray = type.includes('[]') ? true : false
          // TypeValue0 --> Value
          const objectName = typeName.split('Type')[1]?.split(/\d+/)[0]
          const nestedTypeName = `Type${objectName ? objectName : ''}${name.split('_').map((subName: string) => capitalize(subName)).join('')}`
          const nestedMsgTypeIndex = getLatestMsgTypeIndex(nestedTypeName, types)
          const nestedType = getTypeName(name, nestedMsgTypeIndex, objectName, true, isArray)
          msgTypeDefinitions[typeName] = [...(msgTypeDefinitions[typeName] || []), { name, type: nestedType }]
          //Special logic if nested struct is google protobuf's Any type
          if (isGoogleProtobufAnyPackage(packageName, type)) {
            const nestedAnyTypeName = isArray ? nestedType.split('[]')[0]?.split(/\d+/)[0] : nestedType.split(/\d+/)[0]
            const nestedMsgTypeIndex = getLatestMsgTypeIndex(`${nestedAnyTypeName}Value`, types)
            const nestedAnyValueType = `${nestedAnyTypeName}Value${nestedMsgTypeIndex}`
            msgTypeDefinitions[`${nestedAnyTypeName}${nestedMsgTypeIndex}`] = [{ name: "type", type: "string" }, { name: "value", type: nestedAnyValueType }]
            const anyObjectTypeNameSplit = nestedAnyTypeName?.split('Type')[1]?.split(/\d+/)[0]
            const messageTypeUrl = AminoTypesMap.fromAmino(fieldValue).typeUrl
            getMsgValueType(messageTypeUrl, fieldValue.value, "value", nestedMsgTypeIndex, types, anyObjectTypeNameSplit, true, msgTypeDefinitions)
          }
          else {
            const typeStructName = type.includes('[]') ? type.split('[]')[0].split(/\d+/)[0] : type.split(/\d+/)[0]
            const messageTypeUrl = `${packageName}.${typeStructName}`
            getMsgValueType(messageTypeUrl, fieldValue, name, nestedMsgTypeIndex, types, objectName, true, msgTypeDefinitions)

          }
        }
        else {
          msgTypeDefinitions[typeName] = [...(msgTypeDefinitions[typeName] || []), { name, type: getGjsonPrimitiveType(fieldValue) }]
        }
      }
    })
  }
  return msgTypeDefinitions
}

function getGjsonPrimitiveType(value: any) {
  if (typeof value === 'number') {
    return 'int64'
  }
  if (typeof value === 'boolean') {
    return 'bool'
  }
  if (Array.isArray(value) && value.length && value.every(item => typeof item === 'string')) {
    return 'string[]'
  }
  return 'string'
}

function getTypeName(name: string, index: number, objectName?: string, nestedType: boolean = false, isArray: boolean = false) {
  if (nestedType) {
    return `Type${objectName ? objectName : ''}${name.split('_').map(subName => capitalize(subName)).join('')}${index}${isArray ? '[]' : ''}`
  }
  return name
}

function isGoogleProtobufAnyPackage(packageName: string, type: string): boolean {
  return packageName === '/google.protobuf' && type == 'Any'
}

function isNonZeroField(fieldValue: any): boolean {
  // zero fields are considered falsey,except if it is string "0"
  if (fieldValue == "0" && typeof fieldValue !== "string") {
    return false
  }
  // empty arrays are considered truthy
  if (Array.isArray(fieldValue)) {
    return true
  }
  // empty objects are considered truthy
  if (fieldValue && typeof fieldValue === 'object' && Object.keys(fieldValue).length === 0) {
    return true
  }
  return fieldValue
}

export function constructEIP712Tx(doc: StdSignDoc, chainId: string): EIP712Tx {
  const { account_number, chain_id, fee, memo, sequence } = doc
  const eip712Tx = {
    types: getTypes(doc.msgs),
    primaryType: "Tx",
    domain: { ...DEFAULT_CARBON_DOMAIN_FIELDS, chainId },
    message: { account_number, chain_id, fee, memo, sequence, ...convertMsgs(doc.msgs) },
  }

  return eip712Tx
}


function convertMsgs(msgs: readonly AminoMsg[]): any {
  const convertedMsgs: any = {}
  msgs.forEach((msg, index) => {
    convertedMsgs[`msg${index}`] = msg
  })
  return convertedMsgs
}


