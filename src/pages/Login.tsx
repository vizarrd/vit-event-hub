import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Loader2, Mail, Lock, ArrowLeft, User } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['super_admin', 'club_poc']),
  clubId: z.string().optional(),
  secretCode: z.string().min(1, 'Secret code is required'),
});

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'super_admin' | 'club_poc'>('club_poc');
  const [clubId, setClubId] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ 
    email?: string; 
    password?: string; 
    fullName?: string;
    secretCode?: string;
    clubId?: string;
  }>({});
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (mode === 'signup') {
      fetchClubs();
    }
  }, [mode]);

  const fetchClubs = async () => {
    const { data } = await supabase.from('clubs').select('*').order('club_name');
    if (data) setClubs(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (mode === 'login') {
      const validation = loginSchema.safeParse({ email, password });
      if (!validation.success) {
        const fieldErrors: { email?: string; password?: string } = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0] === 'email') fieldErrors.email = err.message;
          if (err.path[0] === 'password') fieldErrors.password = err.message;
        });
        setErrors(fieldErrors);
        return;
      }

      setLoading(true);
      const { error } = await signIn(email, password);
      setLoading(false);

      if (error) {
        toast({
          title: 'Login Failed',
          description: error.message === 'Invalid login credentials' 
            ? 'Invalid email or password. Please try again.'
            : error.message,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Welcome back!', description: 'You have successfully logged in.' });
        navigate('/');
      }
    } else {
      // Signup mode
      const validation = signupSchema.safeParse({ email, password, fullName, role, clubId, secretCode });
      if (!validation.success) {
        const fieldErrors: { email?: string; password?: string; fullName?: string; secretCode?: string; clubId?: string } = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0] === 'email') fieldErrors.email = err.message;
          if (err.path[0] === 'password') fieldErrors.password = err.message;
          if (err.path[0] === 'fullName') fieldErrors.fullName = err.message;
          if (err.path[0] === 'secretCode') fieldErrors.secretCode = err.message;
          if (err.path[0] === 'clubId') fieldErrors.clubId = err.message;
        });
        setErrors(fieldErrors);
        return;
      }

      // Validate secret code
      if (role === 'super_admin') {
        if (secretCode !== 'VIT_OSPC_ADMIN_2025') {
          setErrors({ secretCode: 'Invalid super admin secret code' });
          return;
        }
      } else if (role === 'club_poc') {
        if (!clubId) {
          setErrors({ clubId: 'Please select a club' });
          return;
        }
        
        // Verify club secret code
        const selectedClub = clubs.find(club => club.id === clubId);
        if (!selectedClub || selectedClub.secret_code !== secretCode) {
          setErrors({ secretCode: 'Invalid secret code for the selected club' });
          return;
        }
      }

      setLoading(true);
      const { error, data } = await signUp(email, password, fullName, role, clubId);
      setLoading(false);

      if (error) {
        toast({
          title: 'Signup Failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({ 
          title: 'Account Created Successfully!', 
          description: 'You can now login with your credentials.' 
        });
        setMode('login');
        setFullName('');
        setRole('club_poc');
        setClubId('');
        setSecretCode('');
      }
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptMCAwdi02aC02djZoNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
      
      <Card className="w-full max-w-md relative animate-scale-in shadow-xl border-border/50">
        <CardHeader className="text-center pb-2">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-lg mb-4">
            <Calendar className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">
            {mode === 'login' ? 'Welcome Back' : 'Create Admin Account'}
          </CardTitle>
          <CardDescription>
            {mode === 'login' 
              ? 'Sign in to manage your club events' 
              : 'Create a new admin account for VIT Event Hub'
            }
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`pl-10 ${errors.fullName ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@vit.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-10 ${errors.password ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="role">Account Type</Label>
                <Select value={role} onValueChange={(value: 'super_admin' | 'club_poc') => setRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="club_poc">Club POC (Club Events Only)</SelectItem>
                    <SelectItem value="super_admin">Super Admin (OSPC Full Access)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {mode === 'signup' && role === 'club_poc' && (
              <div className="space-y-2">
                <Label htmlFor="club">Select Your Club</Label>
                <Select value={clubId} onValueChange={setClubId}>
                  <SelectTrigger className={errors.clubId ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Choose your club..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {clubs.map((club) => (
                      <SelectItem key={club.id} value={club.id}>
                        {club.club_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.clubId && <p className="text-xs text-destructive">{errors.clubId}</p>}
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="secretCode">
                  {role === 'super_admin' ? 'OSPC Admin Secret Code' : 'Club Secret Code'}
                </Label>
                <Input
                  id="secretCode"
                  type="password"
                  placeholder={`Enter ${role === 'super_admin' ? 'OSPC admin' : 'your club'} secret code`}
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  className={errors.secretCode ? 'border-destructive' : ''}
                />
                {errors.secretCode && <p className="text-xs text-destructive">{errors.secretCode}</p>}
                <p className="text-xs text-muted-foreground">
                  {role === 'super_admin' 
                    ? 'Contact OSPC admin for the super admin secret code' 
                    : 'Contact your club coordinator for your unique club secret code'
                  }
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
            
            <div className="text-center">
              <Button 
                type="button" 
                variant="link" 
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setErrors({});
                  setSecretCode('');
                  setClubId('');
                }}
                className="text-sm"
              >
                {mode === 'login' 
                  ? 'Need to create an account? Sign up' 
                  : 'Already have an account? Sign in'
                }
              </Button>
            </div>
            
            {mode === 'signup' && (
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                <p className="font-medium mb-1">Secret Code System:</p>
                <p>• <strong>OSPC Admin:</strong> Full system access with static code</p>
                <p>• <strong>Club POC:</strong> Club-specific access with unique codes</p>
                <p>• Each club has a unique secret code for security</p>
              </div>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
