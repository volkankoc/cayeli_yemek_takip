const { z } = require('zod');
const usersService = require('./users.service');

const createSchema = z.object({
  username: z.string().min(3, 'Kullanıcı adı en az 3 karakter olmalı'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
  role: z.enum(['admin', 'user']).optional(),
});

const updateSchema = z.object({
  username: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['admin', 'user']).optional(),
  is_active: z.number().int().min(0).max(1).optional(),
});

function getAll(req, res, next) {
  try {
    const users = usersService.getAll();
    res.json({ success: true, data: users, message: 'İşlem başarılı' });
  } catch (e) { next(e); }
}

function getOne(req, res, next) {
  try {
    const user = usersService.getById(Number(req.params.id));
    res.json({ success: true, data: user, message: 'İşlem başarılı' });
  } catch (e) { next(e); }
}

function create(req, res, next) {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Geçersiz veri', details: parsed.error.errors });
    }
    const user = usersService.create(parsed.data);
    res.status(201).json({ success: true, data: user, message: 'Kullanıcı oluşturuldu' });
  } catch (e) { next(e); }
}

function update(req, res, next) {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Geçersiz veri', details: parsed.error.errors });
    }
    const user = usersService.update(Number(req.params.id), parsed.data);
    res.json({ success: true, data: user, message: 'Kullanıcı güncellendi' });
  } catch (e) { next(e); }
}

function remove(req, res, next) {
  try {
    usersService.remove(Number(req.params.id));
    res.json({ success: true, data: null, message: 'Kullanıcı silindi' });
  } catch (e) { next(e); }
}

module.exports = { getAll, getOne, create, update, remove };
