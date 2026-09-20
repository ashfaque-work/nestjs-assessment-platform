import { RpcException } from '@nestjs/microservices';
import { Types } from 'mongoose';
import { ArticleService } from './article.service';

// destroy() is a soft delete guarded by ownership: any student used to be able to remove anyone's
// article by id. These tests pin that only the author or a staff member can.
const code = (e: unknown) => (e instanceof RpcException ? (e.getError() as any)?.code : undefined);

const AUTHOR = new Types.ObjectId();
const OTHER = new Types.ObjectId();

function serviceReturning(article: { user: Types.ObjectId } | null) {
  const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
  const repo = {
    setInstanceKey: jest.fn(),
    findOne: jest.fn().mockResolvedValue(article),
    updateOne,
  };
  return { service: new ArticleService(repo as any), updateOne };
}

const destroy = (service: ArticleService, userId: Types.ObjectId, userRoles: string[]) =>
  service.destroy({ id: String(AUTHOR), userId: String(userId), userRoles } as any);

// the gRPC status code destroy() rejects with, or undefined if it resolved
async function rejectionCode(promise: Promise<unknown>): Promise<number | undefined> {
  try {
    await promise;
    return undefined;
  } catch (e) {
    return code(e);
  }
}

describe('ArticleService.destroy authorization', () => {
  it('lets the author delete their own article', async () => {
    const { service, updateOne } = serviceReturning({ user: AUTHOR });
    await expect(destroy(service, AUTHOR, ['student'])).resolves.toBeDefined();
    expect(updateOne).toHaveBeenCalledWith({ _id: String(AUTHOR) }, { $set: { active: false } });
  });

  it('lets a staff member delete anyone\'s article', async () => {
    const { service, updateOne } = serviceReturning({ user: AUTHOR });
    await expect(destroy(service, OTHER, ['admin'])).resolves.toBeDefined();
    expect(updateOne).toHaveBeenCalled();
  });

  it('forbids another student from deleting it, and does not touch the article', async () => {
    const { service, updateOne } = serviceReturning({ user: AUTHOR });
    expect(await rejectionCode(destroy(service, OTHER, ['student']))).toBe(7); // PERMISSION_DENIED
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('answers a missing article with NOT_FOUND', async () => {
    const { service, updateOne } = serviceReturning(null);
    expect(await rejectionCode(destroy(service, AUTHOR, ['student']))).toBe(5);
    expect(updateOne).not.toHaveBeenCalled();
  });
});
