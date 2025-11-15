import cluster from 'cluster';
import os from 'os';

import { bootstrap } from './bootstrap';
import { SerialClusterMessage } from './serial/serial-cluster.types';

const workerCount = Math.max(1, Number(process.env.CLUSTER_WORKERS) || os.cpus().length);

async function startWorker() {
  try {
    await bootstrap();
  } catch (error) {
    console.error(`[worker ${process.pid}] failed to bootstrap`, error);
    process.exit(1);
  }
}

if (cluster.isPrimary) {
  console.log(`[cluster] master ${process.pid} starting ${workerCount} workers`);
  const workerRoles = new Map<number, 'leader' | 'replica'>();
  let leaderId: number | null = null;

  const forkWorker = (role: 'leader' | 'replica') => {
    const worker = cluster.fork({
      ...process.env,
      SERIAL_CLUSTER_ROLE: role,
    });
    workerRoles.set(worker.id, role);
    if (role === 'leader') {
      leaderId = worker.id;
    }
    return worker;
  };

  forkWorker('leader');
  for (let i = 1; i < workerCount; i += 1) {
    forkWorker('replica');
  }

  cluster.on('message', (worker, raw) => {
    if (!raw || typeof raw !== 'object') {
      return;
    }
    const message = raw as SerialClusterMessage;
    if (message.channel !== 'serial') {
      return;
    }
    switch (message.type) {
      case 'event':
      case 'state': {
        const workers = cluster.workers ?? {};
        Object.values(workers).forEach((target) => {
          if (!target || target.id === worker.id) {
            return;
          }
          target.send(message);
        });
        break;
      }
      case 'rpc-request': {
        if (!message.requestId) {
          return;
        }
        const leader =
          (leaderId && cluster.workers ? cluster.workers[leaderId] : undefined) ?? undefined;
        if (!leader) {
          worker.send({
            channel: 'serial',
            type: 'rpc-response',
            requestId: message.requestId,
            success: false,
            error: 'Serial leader unavailable',
          } as SerialClusterMessage);
          return;
        }
        leader.send({
          ...message,
          sourceId: worker.id,
        } as SerialClusterMessage);
        break;
      }
      case 'rpc-response': {
        if (typeof message.targetId !== 'number') {
          return;
        }
        const target = cluster.workers?.[message.targetId];
        target?.send(message);
        break;
      }
      default:
        break;
    }
  });

  cluster.on('exit', (worker, code, signal) => {
    const role = workerRoles.get(worker.id) ?? 'replica';
    workerRoles.delete(worker.id);
    if (role === 'leader') {
      leaderId = null;
    }
    console.warn(
      `[cluster] worker ${worker.process.pid} (${role}) exited (${signal ?? code}). Restarting.`,
    );
    const replacementRole: 'leader' | 'replica' = role === 'leader' ? 'leader' : 'replica';
    const replacement = forkWorker(replacementRole);
    if (replacementRole === 'leader') {
      leaderId = replacement.id;
    }
  });
} else {
  startWorker();
}
