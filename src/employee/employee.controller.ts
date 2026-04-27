import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeQueryDto } from './create-employee.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @Roles('admin', 'manager')
  create(@Body() dto: CreateEmployeeDto, @Request() req) {
    return this.employeeService.create(dto, req.user);
  }

  @Get()
  @Roles('admin', 'manager', 'user')
  findAll(@Query() query: EmployeeQueryDto, @Request() req) {
    return this.employeeService.findAll(req.user, query);
  }

  @Get('hierarchy')
  @Roles('admin', 'manager', 'user')
  getHierarchy(@Request() req) {
    return this.employeeService.getHierarchy(req.user);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'user')
  findOne(@Param('id') id: string, @Request() req) {
    return this.employeeService.findOne(id, req.user);
  }

  @Put(':id')
  @Roles('admin', 'manager')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto, @Request() req) {
    return this.employeeService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string, @Request() req) {
    return this.employeeService.remove(id, req.user);
  }
}