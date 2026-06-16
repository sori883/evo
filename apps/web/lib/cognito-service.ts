import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { CognitoService } from "./cognito";
import { serverEnv } from "./env";

/** env から CognitoService を組み立てる（Route Handler 用）。 */
export function createCognitoService(): CognitoService {
  const env = serverEnv();
  return new CognitoService(
    new CognitoIdentityProviderClient({ region: env.AWS_REGION }),
    env.COGNITO_CLIENT_ID,
  );
}
