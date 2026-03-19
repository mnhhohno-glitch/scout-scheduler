interface CreateTaskParams {
  type: "mynavi_new" | "consultation" | "interview";
  candidateName: string;
  preferredDates: string;
  meetingFormat: string;
  email?: string;
  notes?: string;
  advisorName?: string;
  candidateId?: string;
}

export async function createPortalTask(
  params: CreateTaskParams,
): Promise<void> {
  const apiUrl = process.env.PORTAL_TASK_API_URL;
  const apiSecret = process.env.PORTAL_TASK_API_SECRET;

  if (!apiUrl || !apiSecret) {
    console.error("Portal task API URL or secret is not configured");
    return;
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": apiSecret,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        "Failed to create portal task:",
        response.status,
        errorData,
      );
    } else {
      const data = await response.json();
      console.log("Portal task created:", data.taskId, data.taskTitle);
    }
  } catch (error) {
    console.error("Error creating portal task:", error);
  }
}
