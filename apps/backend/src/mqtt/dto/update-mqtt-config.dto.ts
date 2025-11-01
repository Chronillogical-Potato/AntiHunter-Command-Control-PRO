import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class UpdateMqttConfigDto {
  @IsOptional()
  @IsUrl({
    require_protocol: true,
    protocols: ['mqtt', 'mqtts', 'ws', 'wss', 'tcp', 'ssl', 'tls', 'http', 'https'],
  })
  brokerUrl?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  clientId?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsBoolean()
  tlsEnabled?: boolean;

  @IsOptional()
  @IsString()
  caPem?: string;

  @IsOptional()
  @IsString()
  certPem?: string;

  @IsOptional()
  @IsString()
  keyPem?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  qosEvents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  qosCommands?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
