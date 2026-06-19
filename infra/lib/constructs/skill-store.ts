import { RemovalPolicy } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

export interface SkillStoreProps {
  /**
   * base skill のシード元（リポジトリの `skills/` ディレクトリ）。
   * 配下は `skills/<agent>/base/<skill>/SKILL.md` 構造。
   */
  seedPath: string;
}

/**
 * 共有 skill ストア（S3）。エージェント別 namespace で skill を保持する:
 *   skills/<agent>/base/<skill>/SKILL.md     … リポジトリ由来（deploy で seed）
 *   skills/<agent>/dynamic/<skill>/SKILL.md  … 実行時にエージェントが生成
 *
 * アクセス制御は IAM で強制する:
 * - read : ハブ(chat)=全 namespace / 非ハブ=自分の namespace のみ
 * - write: 各エージェント=自分の `dynamic/` のみ
 */
export class SkillStore extends Construct {
  readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: SkillStoreProps) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, "Bucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // base skill を deploy 時に seed する。
    // prune:false が重要 — 既定(true)だと source に無いオブジェクト（=実行時に
    // 生成された dynamic/ skill）を毎デプロイで削除してしまう。base のみ上書きする。
    new s3deploy.BucketDeployment(this, "SeedBase", {
      sources: [s3deploy.Source.asset(props.seedPath)],
      destinationBucket: this.bucket,
      destinationKeyPrefix: "skills/",
      prune: false,
    });
  }

  /**
   * skill の読み取り権限を付与する。
   * @param readAll true=全 namespace を読める（ハブ=chat）/ false=自分のみ。
   */
  grantRead(role: iam.IRole, agentId: string, readAll: boolean): void {
    const objectPattern = readAll ? "skills/*" : `skills/${agentId}/*`;
    const listPrefix = readAll ? "skills/" : `skills/${agentId}/`;
    role.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [this.bucket.arnForObjects(objectPattern)],
      }),
    );
    // listNamespaces / listKeys 用。prefix 条件で読める範囲に限定する。
    role.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["s3:ListBucket"],
        resources: [this.bucket.bucketArn],
        conditions: {
          StringLike: { "s3:prefix": [objectPattern, listPrefix] },
        },
      }),
    );
  }

  /** 自分の dynamic namespace への書き込み権限のみを付与する。 */
  grantWriteDynamic(role: iam.IRole, agentId: string): void {
    role.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject"],
        resources: [this.bucket.arnForObjects(`skills/${agentId}/dynamic/*`)],
      }),
    );
  }
}
