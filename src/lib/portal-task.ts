interface CreateTaskParams {
  type: "mynavi_new" | "consultation" | "interview";
  candidateName: string;
  preferredDates: string;
  meetingFormat: string;
  email?: string;
  notes?: string;
  advisorName?: string;
  candidateId?: string;
  source?: string;
  autoReserve?: boolean;
}

export interface AutoReserveSlot {
  start: string;
  end: string;
  label: string;
}

export interface AutoReserveResult {
  result: "reserved" | "not_reserved";
  slot?: AutoReserveSlot;
  method?: string;
  reason?: string;
}

export interface PortalTaskResponse {
  taskId?: string;
  taskTitle?: string;
  autoReserve?: AutoReserveResult;
}

export async function createPortalTask(
  params: CreateTaskParams,
  options?: { timeoutMs?: number },
): Promise<PortalTaskResponse | null> {
  const apiUrl = process.env.PORTAL_TASK_API_URL;
  const apiSecret = process.env.PORTAL_TASK_API_SECRET;

  if (!apiUrl || !apiSecret) {
    console.error("Portal task API URL or secret is not configured");
    return null;
  }

  const timeoutMs = options?.timeoutMs;
  const controller = timeoutMs ? new AbortController() : null;
  const timer =
    controller && timeoutMs
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": apiSecret,
      },
      body: JSON.stringify(params),
      ...(controller ? { signal: controller.signal } : {}),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        "Failed to create portal task:",
        response.status,
        errorData,
      );
      return null;
    }

    const data = (await response.json()) as PortalTaskResponse;
    console.log("Portal task created:", data.taskId, data.taskTitle);
    return data;
  } catch (error) {
    console.error("Error creating portal task:", error);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
