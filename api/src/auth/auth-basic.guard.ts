// src/auth/auth-basic.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class BasicAuthGuard extends AuthGuard('basic') {}
