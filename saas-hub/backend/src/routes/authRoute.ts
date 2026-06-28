import { Router } from 'express';
import { signUp, signIn, verifyOTP, resendOTP, logout } from '../controllers/authController';
import { validate, registerSchema, loginSchema } from '../middleware/validate';

const router = Router();

router.post('/register',    validate(registerSchema), signUp);
router.post('/login',       validate(loginSchema),    signIn);
router.post('/verify-otp',                            verifyOTP);
router.post('/resend-otp',                            resendOTP);
router.get('/logout',                                 logout);

export default router;
