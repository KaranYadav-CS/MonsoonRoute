import {env} from './env';import {ApiError} from './errors';
export function awsAllowed(dbFlags:{aws_enabled:boolean}){const e=env();if(e.AWS_ENABLED!=='true'||!dbFlags.aws_enabled)throw new ApiError(503,'FEATURE_DISABLED');return true}
