import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateSessionDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
