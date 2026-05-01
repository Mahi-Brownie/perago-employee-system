import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeEntity } from '../entities/employee.entity';
import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeQueryDto } from './create-employee.dto';

type RequestUser = { userId: number; role: string } | null;

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(EmployeeEntity)
    private employeeRepository: Repository<EmployeeEntity>,
  ) {}

  // =========================
  // GET ALL EMPLOYEES (FLAT + RELATIONS)
  // =========================
  async findAll(
    user: RequestUser,
    query: EmployeeQueryDto = {},
  ): Promise<EmployeeEntity[]> {
    const qb = this.employeeRepository.createQueryBuilder('employee');

    qb.leftJoinAndSelect('employee.subordinates', 'subordinates').leftJoinAndSelect(
      'employee.manager',
      'manager',
    );

    if (query.search) {
      qb.andWhere(
        '(employee.name ILIKE :search OR employee.email ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.department) {
      qb.andWhere('employee.department ILIKE :department', {
        department: `%${query.department}%`,
      });
    }

    if (query.position) {
      qb.andWhere('employee.position ILIKE :position', {
        position: `%${query.position}%`,
      });
    }

    if (query.managerId) {
      qb.andWhere('employee.managerId = :managerId', { managerId: query.managerId });
    }

    if (query.createdBy) {
      qb.andWhere('employee.createdBy = :createdBy', { createdBy: query.createdBy });
    }

    if (user && user.role !== 'admin') {
      qb.andWhere('employee.createdBy = :userId', {
        userId: user.userId,
      });
    }

    return qb.getMany();
  }

  // =========================
  // GET HIERARCHY (TREE STRUCTURE)
  // =========================
  async getHierarchy(user: RequestUser): Promise<EmployeeEntity[]> {
    const employees = await this.findAll(user, {});
    const nodeMap = new Map<string, EmployeeEntity & { subordinates: EmployeeEntity[] }>();

    employees.forEach((employee) => {
      nodeMap.set(employee.id, { ...employee, subordinates: [] });
    });

    const isDescendant = (
      node: EmployeeEntity & { subordinates: EmployeeEntity[] },
      targetId: string,
    ): boolean => {
      const stack = [...node.subordinates];
      while (stack.length > 0) {
        const current = stack.pop();
        if (!current) continue;
        if (current.id === targetId) {
          return true;
        }
        stack.push(...(current.subordinates ?? []));
      }
      return false;
    };

    const roots: (EmployeeEntity & { subordinates: EmployeeEntity[] })[] = [];

    nodeMap.forEach((node) => {
      if (node.managerId && nodeMap.has(node.managerId) && node.managerId !== node.id) {
        const parent = nodeMap.get(node.managerId);
        if (parent && !isDescendant(parent, node.id)) {
          parent.subordinates.push(node);
          return;
        }
      }
      roots.push(node);
    });

    return roots;
  }

  // =========================
  // CREATE EMPLOYEE
  // =========================
  async create(dto: CreateEmployeeDto, user: RequestUser) {
    const employee = this.employeeRepository.create({
      ...dto,
      createdBy: user?.userId ?? null,
    });

    return await this.employeeRepository.save(employee);
  }

  // =========================
  // GET ONE EMPLOYEE
  // =========================
  async findOne(id: string, user: RequestUser): Promise<EmployeeEntity> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['subordinates', 'manager'],
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }

    if (user && user.role !== 'admin' && employee.createdBy !== user.userId) {
      throw new ForbiddenException('You do not have access to this employee');
    }

    return employee;
  }

  // =========================
  // UPDATE EMPLOYEE
  // =========================
  async update(
    id: string,
    dto: UpdateEmployeeDto,
    user: RequestUser,
  ): Promise<EmployeeEntity> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['manager'],
    });

    if (!employee) {
      throw new NotFoundException(`Employee with id ${id} not found`);
    }

    if (user && user.role !== 'admin' && employee.createdBy !== user.userId) {
      throw new ForbiddenException('You do not have permission to update this employee');
    }

    Object.assign(employee, {
      name: dto.name ?? employee.name,
      email: dto.email ?? employee.email,
      position: dto.position ?? employee.position,
      department: dto.department ?? employee.department,
      phone: dto.phone ?? employee.phone,
      address: dto.address ?? employee.address,
    });

    if (dto.managerId !== undefined) {
      const manager = await this.employeeRepository.findOne({
        where: { id: dto.managerId },
      });

      employee.manager = manager ?? null;
    }

    return this.employeeRepository.save(employee);
  }

  // =========================
  // DELETE EMPLOYEE
  // =========================
  async remove(id: string, user: RequestUser): Promise<void> {
    if (!user) {
      const result = await this.employeeRepository.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`Employee with id ${id} not found`);
      }
      return;
    }

    if (user.role === 'admin') {
      const result = await this.employeeRepository.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`Employee with id ${id} not found`);
      }
      return;
    }

    if (user.role === 'manager') {
      const employee = await this.employeeRepository.findOne({ where: { id } });
      if (!employee) {
        throw new NotFoundException(`Employee with id ${id} not found`);
      }
      if (employee.createdBy !== user.userId) {
        throw new ForbiddenException('You do not have permission to delete this employee');
      }
      await this.employeeRepository.delete(id);
      return;
    }

    throw new ForbiddenException('You do not have permission to delete employees');
  }

}
