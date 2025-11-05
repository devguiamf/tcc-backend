import { UserOutput } from "@/user/models/types/user.types";

export interface LoginOutput {
  accessToken: string;
  user: UserOutput;
}

export interface SignupOutput {
  accessToken: string;
  user: UserOutput;
}

