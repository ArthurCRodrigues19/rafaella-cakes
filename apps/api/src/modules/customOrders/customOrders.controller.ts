import type { Request, Response } from 'express';
import { publicUrl } from '../../lib/storage';
import { customOrdersService } from './customOrders.service';

export const customOrdersController = {
  /** Recebe multipart/form-data (campos + imagem de referência opcional). */
  async create(req: Request, res: Response) {
    const imageUrl = req.file ? publicUrl(req.file.filename) : null;
    res.status(201).json(await customOrdersService.create(req.user, req.body, imageUrl));
  },

  async listMine(req: Request, res: Response) {
    res.json(await customOrdersService.listMine(req.user!));
  },

  async accept(req: Request, res: Response) {
    res.json(await customOrdersService.accept(req.user!, req.params.id, req.body));
  },

  async decline(req: Request, res: Response) {
    await customOrdersService.decline(req.user!, req.params.id);
    res.status(204).end();
  },
};
