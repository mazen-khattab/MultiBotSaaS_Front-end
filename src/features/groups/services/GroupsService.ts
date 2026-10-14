import { z } from "zod"

import { api } from "@/core/api/api"
import { normalizeApiError } from "@/core/api/apiError"
import { isApiResponse } from "@/core/api/apiGuards"
import { readApiData } from "@/core/api/readApiData"
import { groupDetailSchema, groupListSchema, toCreateGroupDto, toUpdateGroupDto } from "@/features/groups/adapters/groupAdapter"
import type { CreateGroupInput, UpdateGroupInput } from "@/features/groups/types/groups.types"

const endpoint = "/api/v1/targetgroups"
const readEndpoint = "/api/v1/TargetGroups"

/** Create/update data is unspecified in V2 and must never become a group ID. */
async function save(method: "post" | "put", url: string, input: UpdateGroupInput) {
  const response = await api[method]<unknown>(url, input)
  if (!isApiResponse(response.data)) throw normalizeApiError(response.data)
}

/** Shared Axios sends session cookies; backend authorization remains mandatory. */
export const GroupsService = {
  create(input: CreateGroupInput): Promise<void> {
    return save("post", endpoint, toCreateGroupDto(input))
  },
  async getAll(botId: number, signal?: AbortSignal) {
    // The updated read routes scope results on the server using the bot path.
    const response = await api.get<unknown>(`${readEndpoint}/${botId}`, { signal })
    return readApiData(response.data, groupListSchema.array())
  },
  async getById(botId: number, id: number, signal?: AbortSignal) {
    const response = await api.get<unknown>(`${readEndpoint}/${botId}/${id}`, { signal })
    const group = readApiData(response.data, groupDetailSchema)
    if (group.id !== id) throw normalizeApiError({ message: "The server returned a different target group." })
    return group
  },
  update(id: number, input: UpdateGroupInput): Promise<void> {
    return save("put", `${endpoint}/${id}`, toUpdateGroupDto(input))
  },
  async delete(id: number): Promise<void> {
    const response = await api.delete<unknown>(`${endpoint}/${id}`)
    // Unlike the historical Part 16 response, V2 documents a boolean here.
    readApiData(response.data, z.literal(true))
  },
}
