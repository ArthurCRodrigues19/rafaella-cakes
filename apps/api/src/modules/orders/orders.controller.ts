import type { Request, Response } from 'express';
import { ordersService } from './orders.service';
import { paymentsService } from './payments.service';
import { ordersRepository } from './orders.repository';
import { toOrderDTO } from './orders.dto';
import { quoteCart } from './pricing';

export const ordersController = {
  async quote(req: Request, res: Response) {
    res.json(await quoteCart(req.body));
  },

  async create(req: Request, res: Response) {
    res.status(201).json(await ordersService.create(req.user!, req.body));
  },

  async listMine(req: Request, res: Response) {
    res.json(await ordersService.listMine(req.user!.id));
  },

  async detail(req: Request, res: Response) {
    const order = await ordersService.getForUser(req.user!, req.params.id);
    if (order.status === 'PENDING_PAYMENT') {
      await paymentsService.refreshPending(order.id);
      const fresh = await ordersRepository.findDetail(order.id);
      return res.json(toOrderDTO(fresh!));
    }
    res.json(toOrderDTO(order));
  },

  async pay(req: Request, res: Response) {
    res.status(201).json(await paymentsService.pay(req.user!, req.params.id, req.body));
  },

  async simulate(req: Request, res: Response) {
    await paymentsService.simulateApproval(req.user!, req.params.id);
    res.json({ ok: true });
  },

  paymentConfig(_req: Request, res: Response) {
    res.json(paymentsService.config());
  },

  /** POST /api/webhooks/mercadopago — aceita o formato novo (JSON) e o antigo (query string). */
  async webhook(req: Request, res: Response) {
    const type = (req.body?.type ?? req.query.type ?? req.query.topic) as string | undefined;
    const dataId = String(req.body?.data?.id ?? req.query['data.id'] ?? req.query.id ?? '');
    if (type && type !== 'payment') return res.sendStatus(200);
    if (!dataId) return res.sendStatus(200);

    await paymentsService.handleWebhook(
      dataId,
      req.header('x-signature') ?? undefined,
      req.header('x-request-id') ?? undefined,
    );
    res.sendStatus(200);
  },
};
