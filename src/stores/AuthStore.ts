import { defineStore } from "pinia";
import { APIInstance, mediaInstance } from "@/utils/Axios";
import { ref } from "vue";

import { connect } from "@/utils/Socket";
import { useCommonStore } from "@/stores/CommonStore";
import router from "@/router";
import { useNotesStore } from "./NoteStore";

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  profilePic: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  repeatedPassword: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export const useAuthStore = defineStore("auth", () => {
  const isLoggedIn = ref(false);
  const token = ref("");
  const activeUser = ref("");
  const commonStore = useCommonStore();
  const noteStore = useNotesStore();

  const register = async (registerData: RegisterData) => {
    if (registerData.password !== registerData.repeatedPassword) {
      throw {
        errors: ["Passwords do not match"],
      };
    }

    try {
      const res = await APIInstance.request({
        method: "POST",
        url: "/auth/register",
        data: {
          username: registerData.username,
          email: registerData.email,
          password: registerData.password,
        },
      });

      return true;
    } catch (err: any) {
      if (err.response) throw { errors: err.response.data.errors };
      else throw err;
    }
  };

  const login = async (loginData: LoginData) => {
    try {
      const res = await APIInstance.request({
        method: "POST",
        url: "/auth/login",
        data: {
          username: loginData.username,
          password: loginData.password,
        },
      });

      if (res.status === 200) {
        isLoggedIn.value = true;
        token.value = res.data.token;

        localStorage.setItem("token", res.data.token);

        return true;
      }
      return false;
    } catch (err: any) {
      if (err.response) throw { errors: err.response.data.errors };
      else throw err;
    }
  };

  const checkPassword = async (password: string) => {
    try {
      const res = await APIInstance.request({
        method: "POST",
        url: "/auth/checkPassword",
        data: {
          password,
        },
      });

      if (!res.data.valid) return false;
      return true;
    } catch {
      return false;
    }
  };

  const getActiveUser = async () => {
    const res = await APIInstance.request({
      method: "GET",
      url: "/auth/",
    });
    if (res) return res.data.uid;
  };

  const checkToken = async () => {
    try {
      const res = await APIInstance.request({
        method: "GET",
        url: "/auth/checkSession",
      });

      if (res.status !== 200) throw { errors: "Invalid session" };

      return true;
    } catch (err: any) {
      return false;
    }
  };

  const clearLocal = async () => {
    isLoggedIn.value = false;
    token.value = "";
    activeUser.value = "";
    localStorage.removeItem("token");

    await router.push({ name: "SignIn" });
    window.location.reload();
  };

  const logout = async () => {
    try {
      const res = await APIInstance.request({
        method: "DELETE",
        url: "/auth/logout",
      });

      if (res.status === 204) {
        await clearLocal();
        return true;
      } else {
        return false;
      }
    } catch (err: any) {
      if (err.response) throw { errors: err.response.data.errors };
      else throw err;
    }
  };

  const init = async () => {
    const Token = localStorage.getItem("token");
    if (!Token) return false;
    token.value = Token;

    try {
      APIInstance.defaults.headers = {
        Authorization: `Bearer ${token.value}`,
      } as any;

      mediaInstance.defaults.headers = {
        Authorization: `Bearer ${token.value}`,
      } as any;

      if (!(await checkToken())) {
        await clearLocal();

        return false;
      }
      isLoggedIn.value = true;

      activeUser.value = await getActiveUser();

      connect({
        token: `Bearer ${token.value}`,
      });

      await commonStore.fetchActiveUser();
      await noteStore.fetchNotes();

      return true;
    } catch (err: any) {
      localStorage.removeItem("token");
      console.log(err);
      return false;
    }
  };
  return {
    register,
    login,
    logout,
    init,
    isLoggedIn,
    checkPassword,
    clearLocal,
  };
});
