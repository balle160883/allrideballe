import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../services/db.service';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'allride-super-secret-key-2026';

// Dominios institucionales permitidos (Ejemplo)
const ALLOWED_DOMAINS = ['empresa.com', 'universidad.edu', 'corporativo.net', 'google.com'];

/**
 * POST /api/v1/auth/register
 */
router.post('/register', async (req: Request, res: Response) => {
  const { fullName, email, password } = req.body;

  try {
    // 1. Validar si ya existe
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'El usuario ya existe' });

    // 2. Validar Dominio Institucional
    const domain = email.split('@')[1];
    const isInstitutional = ALLOWED_DOMAINS.includes(domain);

    // 3. Hashear password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Crear usuario
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        institutionEmail: isInstitutional ? email : null,
        isVerified: isInstitutional // Verificación automática si es de dominio conocido
      }
    });

    res.status(201).json({ 
      message: 'Usuario registrado', 
      isInstitutional,
      user: { id: user.id, fullName: user.fullName, email: user.email } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Error en el registro' });
  }
});

/**
 * POST /api/v1/auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ 
      token, 
      user: { id: user.id, fullName: user.fullName, email: user.email, isVerified: user.isVerified } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Error en el login' });
  }
});

export default router;
