/* eslint-disable camelcase */
import stream from 'stream'

import {
  Status,
  Priority,
  Source,
  TicketPayload,
}                     from './schema'
import {
  getSimpleUnirest,
  SimpleUnirest,
}                     from './unirest'

interface CreateTicketArgs {
  requesterId : number,
  subject     : string,
  description : string,
  attachments?: stream.Readable[]
}

interface ReplyTicketArgs {
  ticketId : number,
  userId   : number,
  body     : string,
  attachments?: stream.Readable[],
}

interface CreateContactArgs {
  externalId : string,
  name       : string,
}

interface IdPayload {
  id: number
}

const ticketCreator = (rest: SimpleUnirest) => async (args: CreateTicketArgs): Promise<number> => {

  const DEFAULT_PAYLOAD = {
    priority           : Priority.Medium,
    source             : Source.Chat,
    status             : Status.Open,
  }

  let payload: TicketPayload = {
    description  : args.description,
    requester_id : args.requesterId,
    subject      : args.subject,
  }

  payload = {
    ...DEFAULT_PAYLOAD,
    ...payload,
  }

  const request = rest.post<IdPayload>('tickets')

  if (args.attachments && args.attachments.length > 0) {
    request.field(payload)
    args.attachments.forEach(stream => request.attach('attachments[]', stream))
  } else {
    request.type('json')
    request.send(payload)
  }

  const ret = await request

  // console.info('ret:', ret.body)
  return ret.body.id
}

const ticketReplier = (rest: SimpleUnirest) => async (args: ReplyTicketArgs): Promise<number> => {
  const payload = {
    body    : args.body,
    user_id : args.userId,
  }

  const request = rest.post<IdPayload>(`tickets/${args.ticketId}/reply`)

  if (args.attachments && args.attachments.length > 0) {
    request.field(payload)
    args.attachments.forEach(stream => request.attach('attachments[]', stream))
  } else {
    request.type('json')
    request.send(payload)
  }

  const ret = await request
  //  as any as { body: IdPayload }

  // console.info('ret:', ret.body)
  return ret.body.id
}

const ticketGetter = (rest: SimpleUnirest) => async (requesterId: number): Promise<number[]> => {
  const query = `requester_id=${requesterId}`
  const ret = await rest.get<IdPayload[]>(`tickets?${query}`)

  // console.info(ret.body)
  // return ret.map(p => p.id)

  if (ret.body.length)  {
    return ret.body.map(p => p.id)
  } else {
    return []
  }

}

const contactCreator = (rest: SimpleUnirest) => async (args: CreateContactArgs): Promise<number> => {
  const payload = {
    name               : args.name,
    unique_external_id : args.externalId,
  }

  const ret = await rest
    .post<IdPayload>('contacts')
    .type('json')
    .send(payload)

  // TODO(huan): deal with HTTP non-200 error

  // console.info(ret.body)
  return ret.body.id
}

const contactGetter = (rest: SimpleUnirest) => async (externalId: string): Promise<undefined | number> => {
  const query = `unique_external_id:'${externalId}'`
  const ret = await rest
    .get<{ results: IdPayload[] }>(`search/contacts/?query="${query}"`)

  // console.info(ret.body)

  if (ret.body.results.length)  {
    return ret.body.results.map(p => p.id)[0]
  } else {
    return undefined
  }

}

export {
  getSimpleUnirest as getUnirest,
  contactGetter,
  contactCreator,
  ticketCreator,
  ticketReplier,
  ticketGetter,
}
