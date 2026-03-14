interface StaffInfo {
  id: string;
  name: string;
  email: string;
  lineworksId: string | null;
}

export async function getStaffByName(advisorName: string): Promise<StaffInfo | null> {
  const portalUrl = process.env.PORTAL_API_URL;
  const apiKey = process.env.PORTAL_API_KEY;

  if (!portalUrl || !apiKey) {
    console.warn("PORTAL_API_URL or PORTAL_API_KEY not configured, skipping staff lookup");
    return null;
  }

  try {
    const res = await fetch(
      `${portalUrl}/api/internal/staff?name=${encodeURIComponent(advisorName)}`,
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!res.ok) {
      console.error(`Portal API error: ${res.status}`);
      return null;
    }

    const data = await res.json();

    if (data.staff && data.staff.length > 0) {
      const exactMatch = data.staff.find(
        (s: StaffInfo) => s.name === advisorName,
      );
      return exactMatch || data.staff[0];
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch staff info from portal:", error);
    return null;
  }
}
