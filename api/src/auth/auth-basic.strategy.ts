// src/auth/auth-basic.strategy.ts
import { BasicStrategy as Strategy } from 'passport-http';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BasicStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  public validate = async (user: string, pass: string): Promise<boolean> => {
    if (
      this.configService.get<string>('HTTP_BASIC_USER') === user &&
      this.configService.get<string>('HTTP_BASIC_PASS') === pass
    ) {
      return true;
    }
    throw new UnauthorizedException();
  };
}
