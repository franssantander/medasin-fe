import { axiosClient } from "@/lib/axios";
import type { ApiResponse } from "@/features/areas/type";
import type {
  Resource,
  ResourceFilters,
  ResourceInput,
  ResourcePage,
  ResourceTag,
  ResourceUpdateInput,
} from "../type";

export const resourceService = {
  async list(
    filters: ResourceFilters = {},
    page = 1,
    signal?: AbortSignal,
  ): Promise<ResourcePage> {
    return (
      await axiosClient.get<ResourcePage>("/resource", {
        params: { ...filters, page, per_page: 15 },
        signal,
      })
    ).data;
  },
  async tags(): Promise<ApiResponse<ResourceTag[]>> {
    return (await axiosClient.get<ApiResponse<ResourceTag[]>>("/resource/tags"))
      .data;
  },
  async create(input: ResourceInput): Promise<ApiResponse<Resource>> {
    const { files, ...values } = input;
    let body: typeof values | FormData = values;
    if (files.length) {
      body = new FormData();
      body.append("title", values.title);
      if (values.icon) body.append("icon", values.icon);
      if (values.background) body.append("background", values.background);
      if (values.content)
        body.append("content", JSON.stringify(values.content));
      for (const field of ["project_uuid", "area_uuid"] as const) {
        if (values[field]) body.append(field, values[field]);
      }
      for (const field of ["links", "tag_names", "tag_uuids"] as const) {
        values[field].forEach((value) =>
          (body as FormData).append(`${field}[]`, value),
        );
      }
      files.forEach((file) => (body as FormData).append("files[]", file));
    }
    return (
      await axiosClient.post<ApiResponse<Resource>>("/resource", body, {
        timeout: 120000,
      })
    ).data;
  },
  async update(input: ResourceUpdateInput): Promise<ApiResponse<Resource>> {
    const { resourceUuid, ...values } = input;
    return (
      await axiosClient.patch<ApiResponse<Resource>>(
        `/resource/${resourceUuid}`,
        values,
      )
    ).data;
  },
  async addAttachments(
    resourceUuid: string,
    input: { links?: string[]; files?: File[] },
  ): Promise<ApiResponse<Resource>> {
    const body = new FormData();
    input.links?.forEach((value) => body.append("links[]", value));
    input.files?.forEach((value) => body.append("files[]", value));
    return (
      await axiosClient.post<ApiResponse<Resource>>(
        `/resource/${resourceUuid}/attachments`,
        body,
        { timeout: 120000 },
      )
    ).data;
  },
  async deleteAttachment(
    resourceUuid: string,
    attachmentUuid: string,
  ): Promise<ApiResponse<Resource>> {
    return (
      await axiosClient.delete<ApiResponse<Resource>>(
        `/resource/${resourceUuid}/attachments/${attachmentUuid}`,
      )
    ).data;
  },
  async archive(resourceUuid: string): Promise<ApiResponse<Resource>> {
    return (
      await axiosClient.post<ApiResponse<Resource>>(
        `/resource/${resourceUuid}/archive`,
      )
    ).data;
  },
  async restore(resourceUuid: string): Promise<ApiResponse<Resource>> {
    return (
      await axiosClient.post<ApiResponse<Resource>>(
        `/resource/${resourceUuid}/restore`,
      )
    ).data;
  },
  async attachment(
    resourceUuid: string,
    attachmentUuid: string,
    signal?: AbortSignal,
  ): Promise<Blob> {
    return (
      await axiosClient.get<Blob>(
        `/resource/${resourceUuid}/attachments/${attachmentUuid}`,
        { responseType: "blob", signal, timeout: 120000 },
      )
    ).data;
  },
};
