import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import {
  CfnLayerVersionPermission,
  Code,
  LayerVersion,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join, resolve, sep } from 'node:path';

export interface LayerPublisherStackProps extends StackProps {
  readonly layerName?: string;
  readonly powertoolsPackageVersion?: string;
  readonly ssmParameterLayerArn: string;
  readonly buildFromLocal?: boolean;
}

export class LayerPublisherStack extends Stack {
  public readonly lambdaLayerVersion: LayerVersion;
  public constructor(
    scope: Construct,
    id: string,
    props: LayerPublisherStackProps
  ) {
    super(scope, id, props);

    const { layerName, powertoolsPackageVersion, buildFromLocal } = props;

    console.log(
      `publishing layer ${layerName} version : ${powertoolsPackageVersion}`
    );

    this.lambdaLayerVersion = new LayerVersion(this, 'LambdaPowertoolsLayer', {
      layerVersionName: props?.layerName,
      description: `Powertools for AWS Lambda (TypeScript) version ${powertoolsPackageVersion}`,
      compatibleRuntimes: [Runtime.NODEJS_16_X, Runtime.NODEJS_18_X],
      license: 'MIT-0',
      // This is needed because the following regions do not support the compatibleArchitectures property #1400
      // ...(![ 'eu-south-2', 'eu-central-2', 'ap-southeast-4' ].includes(Stack.of(this).region) ? { compatibleArchitectures: [Architecture.X86_64] } : {}),
      code: Code.fromAsset(resolve(__dirname), {
        bundling: {
          // This is here only because is required by CDK, however it is not used since the bundling is done locally
          image: Runtime.NODEJS_18_X.bundlingImage,
          // We need to run a command to generate a random UUID to force the bundling to run every time
          command: [`echo "${randomUUID()}"`],
          local: {
            tryBundle(outputDir: string) {
              // This folder are relative to the layers folder
              const tmpBuildPath = resolve(__dirname, '..', 'tmp');
              const tmpBuildDir = join(tmpBuildPath, 'nodejs');
              // This folder is the project root, relative to the current file
              const projectRoot = resolve(__dirname, '..', '..');

              // This is the list of packages that we need include in the Lambda Layer
              // the name is the same as the npm workspace name
              const utilities = [
                'commons',
                'logger',
                'metrics',
                'tracer',
                'parameters',
                'idempotency',
                'batch',
              ];

              // These files are relative to the tmp folder
              const filesToRemove = [
                'node_modules/@types',
                'package.json',
                'package-lock.json',
                'node_modules/**/*.md',
                'node_modules/.bin',
                'node_modules/**/*.html',
                'node_modules/**/.travis.yml',
                'node_modules/**/.eslintrc',
                'node_modules/**/.npmignore',
                'node_modules/semver/bin',
                'node_modules/emitter-listener/test',
                'node_modules/fast-xml-parser/cli',
                'node_modules/async-hook-jl/test',
                'node_modules/stack-chain/test',
                'node_modules/shimmer/test',
                'node_modules/jmespath/artifacts',
                'node_modules/jmespath/bower.json',
                'node_modules/obliterator/*.d.ts',
                'node_modules/strnum/.vscode',
                'node_modules/strnum/*.test.js',
                'node_modules/uuid/bin',
                'node_modules/uuid/esm-browser',
                'node_modules/uuid/esm-node',
                'node_modules/uuid/umd',
                'node_modules/mnemonist/*.d.ts',
                // We remove the type definitions and ES builds since they are not used in the Lambda Layer
                'node_modules/@aws-lambda-powertools/*/lib/**/*.d.ts',
                'node_modules/@aws-lambda-powertools/*/lib/**/*.d.ts.map',
                'node_modules/@aws-sdk/*/dist-types',
                'node_modules/@aws-sdk/*/dist-es',
                'node_modules/@smithy/*/dist-types',
                'node_modules/@smithy/*/dist-es',
                'node_modules/@smithy/**/README.md ',
                'node_modules/@aws-sdk/**/README.md ',
              ];
              const buildCommands: string[] = [];
              // We need these modules because they are not included in the nodejs14x and nodejs16x runtimes
              const modulesToInstall: string[] = [
                '@aws-sdk/client-dynamodb',
                '@aws-sdk/util-dynamodb',
                '@aws-sdk/client-ssm',
                '@aws-sdk/client-secrets-manager',
                '@aws-sdk/client-appconfigdata',
              ];

              if (buildFromLocal) {
                for (const util of utilities) {
                  // Build latest version of the package
                  buildCommands.push(`npm run build -w packages/${util}`);
                  // Pack the package to a .tgz file
                  buildCommands.push(`npm pack -w packages/${util}`);
                  // Move the .tgz file to the tmp folder
                  buildCommands.push(
                    `mv aws-lambda-powertools-${util}-*.tgz ${tmpBuildDir}`
                  );
                }
                modulesToInstall.push(
                  ...utilities.map((util) =>
                    join(tmpBuildDir, `aws-lambda-powertools-${util}-*.tgz`)
                  )
                );
                filesToRemove.push(
                  ...utilities.map((util) =>
                    join(`aws-lambda-powertools-${util}-*.tgz`)
                  )
                );
              } else {
                // Dependencies to install in the Lambda Layer
                modulesToInstall.push(
                  ...utilities.map(
                    (util) =>
                      `@aws-lambda-powertools/${util}@${powertoolsPackageVersion}`
                  )
                );
              }

              // Phase 0: Remove after pre-release
              // we need this because while we are in pre-release, the version is not updated normally on this branch
              execSync(
                `echo "{ \"iteration\": 0 }" > ${join(projectRoot, 'v2.json')}`
              );

              // Phase 1: Cleanup & create tmp folder
              execSync(
                [
                  // Clean up existing tmp folder from previous builds
                  `rm -rf ${tmpBuildDir}`,
                  // Create tmp folder again
                  `mkdir -p ${tmpBuildDir}`,
                ].join(' && ')
              );

              // Phase 2: (Optional) Build packages & pack them
              buildFromLocal &&
                execSync(buildCommands.join(' && '), { cwd: projectRoot });

              // Phase 3: Install dependencies to tmp folder
              execSync(
                `npm i --prefix ${tmpBuildDir} ${modulesToInstall.join(' ')}`
              );

              // Phase 4: Remove unnecessary files
              execSync(
                `rm -rf ${filesToRemove
                  .map((filePath) => `${tmpBuildDir}/${filePath}`)
                  .join(' ')}`
              );

              // Phase 5: Copy files from tmp folder to cdk.out asset folder (the folder is created by CDK)
              execSync(`cp -R ${tmpBuildPath}${sep}* ${outputDir}`);

              // Phase 6: (Optional) Restore changes to the project root made by the build
              buildFromLocal &&
                execSync('git restore packages/*/package.json', {
                  cwd: projectRoot,
                });

              return true;
            },
          },
        },
      }),
    });

    const layerPermission = new CfnLayerVersionPermission(
      this,
      'PublicLayerAccess',
      {
        action: 'lambda:GetLayerVersion',
        layerVersionArn: this.lambdaLayerVersion.layerVersionArn,
        principal: '*',
      }
    );

    layerPermission.applyRemovalPolicy(RemovalPolicy.RETAIN);
    this.lambdaLayerVersion.applyRemovalPolicy(RemovalPolicy.RETAIN);

    new StringParameter(this, 'VersionArn', {
      parameterName: props.ssmParameterLayerArn,
      stringValue: this.lambdaLayerVersion.layerVersionArn,
    });

    new CfnOutput(this, 'LatestLayerArn', {
      value: this.lambdaLayerVersion.layerVersionArn,
      exportName: props?.layerName ?? `LambdaPowerToolsForTypeScriptLayerARN`,
    });
  }
}
