import { describe, it, expect } from "bun:test";
import { useAuthStore } from "../../src/store/useAuthStore.ts";

describe("Frontend Store & Routing Architecture", () => {
  it("manages authentication state correctly in Zustand store", () => {
    const { setAuth, logout } = useAuthStore.getState();

    setAuth("test-token-123", {
      id: 1,
      email: "agent@xatwoot.local",
      name: "Agent Smith",
      role: "admin",
      account_id: 10,
    });

    let state = useAuthStore.getState();
    expect(state.token).toBe("test-token-123");
    expect(state.user?.email).toBe("agent@xatwoot.local");
    expect(state.user?.account_id).toBe(10);

    logout();
    state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });
});
