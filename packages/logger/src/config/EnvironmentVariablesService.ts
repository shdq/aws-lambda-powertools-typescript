import { ConfigServiceInterface } from './ConfigServiceInterface.js';
import { EnvironmentVariablesService as CommonEnvironmentVariablesService } from '@aws-lambda-powertools/commons';

/**
 * Class EnvironmentVariablesService
 *
 * This class is used to return environment variables that are available in the runtime of
 * the current Lambda invocation.
 * These variables can be a mix of runtime environment variables set by AWS and
 * variables that can be set by the developer additionally.
 *
 * @class
 * @extends {CommonEnvironmentVariablesService}
 * @implements {ConfigServiceInterface}
 * @see https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime
 * @see https://awslabs.github.io/aws-lambda-powertools-typescript/latest/#environment-variables
 */
class EnvironmentVariablesService extends CommonEnvironmentVariablesService implements ConfigServiceInterface {

  // Reserved environment variables
  private awsRegionVariable = 'AWS_REGION';
  private currentEnvironmentVariable = 'ENVIRONMENT';
  private devModeVariable = 'POWERTOOLS_DEV';
  private functionNameVariable = 'AWS_LAMBDA_FUNCTION_NAME';
  private functionVersionVariable = 'AWS_LAMBDA_FUNCTION_VERSION';
  private logEventVariable = 'POWERTOOLS_LOGGER_LOG_EVENT';
  private logLevelVariable = 'LOG_LEVEL';
  private memoryLimitInMBVariable = 'AWS_LAMBDA_FUNCTION_MEMORY_SIZE';
  private sampleRateValueVariable = 'POWERTOOLS_LOGGER_SAMPLE_RATE';

  /**
   * It returns the value of the AWS_REGION environment variable.
   *
   * @returns {string}
   */
  public getAwsRegion(): string {
    return this.get(this.awsRegionVariable);
  }

  /**
   * It returns the value of the ENVIRONMENT environment variable.
   *
   * @returns {string}
   */
  public getCurrentEnvironment(): string {
    return this.get(this.currentEnvironmentVariable);
  }

  /**
   * It returns the value of the AWS_LAMBDA_FUNCTION_MEMORY_SIZE environment variable.
   *
   * @returns {string}
   */
  public getFunctionMemory(): number {
    const value = this.get(this.memoryLimitInMBVariable);

    return Number(value);
  }

  /**
   * It returns the value of the AWS_LAMBDA_FUNCTION_NAME environment variable.
   *
   * @returns {string}
   */
  public getFunctionName(): string {
    return this.get(this.functionNameVariable);
  }

  /**
   * It returns the value of the AWS_LAMBDA_FUNCTION_VERSION environment variable.
   *
   * @returns {string}
   */
  public getFunctionVersion(): string {
    return this.get(this.functionVersionVariable);
  }

  /**
   * It returns the value of the POWERTOOLS_LOGGER_LOG_EVENT environment variable.
   *
   * @returns {boolean}
   */
  public getLogEvent(): boolean {
    const value = this.get(this.logEventVariable);
    
    return this.isValueTrue(value);
  }

  /**
   * It returns the value of the LOG_LEVEL environment variable.
   *
   * @returns {string}
   */
  public getLogLevel(): string {
    return this.get(this.logLevelVariable);
  }

  /**
   * It returns the value of the POWERTOOLS_LOGGER_SAMPLE_RATE environment variable.
   *
   * @returns {string|undefined}
   */
  public getSampleRateValue(): number | undefined {
    const value = this.get(this.sampleRateValueVariable);

    return (value && value.length > 0) ? Number(value) : undefined;
  }

  /**
   * It returns true if the POWERTOOLS_DEV environment variable is set to truthy value.
   *
   * @returns {boolean}
   */
  public isDevMode(): boolean {
    const value = this.get(this.devModeVariable);

    return this.isValueTrue(value);
  }

  /**
   * It returns true if the string value represents a boolean true value.
   *
   * @param {string} value
   * @returns boolean
   */
  public isValueTrue(value: string): boolean {
    const truthyValues: string[] = [ '1', 'y', 'yes', 't', 'true', 'on' ];

    return truthyValues.includes(value.toLowerCase());
  }

}

export {
  EnvironmentVariablesService,
};