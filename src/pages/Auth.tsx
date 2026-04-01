import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, Loader2, Users, IdCard, Briefcase, ShieldCheck, GraduationCap, School } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const staffLoginSchema = z.object({
  identifier: z.string().min(1, 'Please enter your email or Teacher ID'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const parentLoginSchema = z.object({
  studentId: z.string().min(1, 'Please enter Student ID'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

const adminSignupSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Please enter your full name'),
});

interface SchoolOption {
  id: string;
  name: string;
  code: string;
  address: string | null;
}

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'staff' | 'parent'>('staff');
  const [checkingAdmins, setCheckingAdmins] = useState(true);
  const [hasAdmins, setHasAdmins] = useState(true);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [loadingSchools, setLoadingSchools] = useState(true);
  
  const [staffForm, setStaffForm] = useState({ identifier: '', password: '' });
  const [parentForm, setParentForm] = useState({ studentId: '', password: '' });
  const [signupForm, setSignupForm] = useState({ email: '', password: '', fullName: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signIn, user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch schools list
  useEffect(() => {
    const fetchSchools = async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, code, address')
        .eq('is_active', true)
        .order('name');
      
      if (!error && data) {
        setSchools(data);
      }
      setLoadingSchools(false);
    };
    fetchSchools();
  }, []);

  // Check if any admin exists using secure RPC function
  const checkAdmins = async () => {
    const { data, error } = await supabase.rpc('admin_exists');
    
    if (error) {
      console.error('Error checking admin:', error);
      setHasAdmins(true);
    } else {
      setHasAdmins(data === true);
    }
    setCheckingAdmins(false);
  };

  useEffect(() => {
    checkAdmins();
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      checkAdmins();
    }
    
    if (!loading && user && userRole) {
      const path = userRole === 'super_admin' ? '/super-admin' : `/${userRole}`;
      navigate(path);
    }
  }, [user, userRole, loading, navigate]);

  // Check if user is logging in as admin (email) — no school needed
  const isAdminEmail = (identifier: string) => identifier.includes('@');

  // Staff Login (Admin with email, Teacher with ID)
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    try {
      staffLoginSchema.parse(staffForm);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    const identifier = staffForm.identifier.trim();
    
    // For Teacher ID login, school selection is required if schools exist
    if (!isAdminEmail(identifier) && schools.length > 0 && !selectedSchoolId) {
      setErrors({ school: 'Please select your school' });
      return;
    }

    setIsLoading(true);
    
    if (isAdminEmail(identifier)) {
      // Admin login with email — no school needed
      const { error } = await signIn(identifier, staffForm.password);
      if (error) {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message === 'Invalid login credentials' 
            ? 'Invalid email or password. Please try again.'
            : error.message,
        });
      }
    } else {
      // Teacher login with Teacher ID — use school-scoped lookup
      try {
        const rpcParams: any = { teacher_identifier: identifier };
        if (selectedSchoolId) {
          rpcParams._school_id = selectedSchoolId;
        }
        
        const { data: teacherEmail, error: rpcError } = await supabase
          .rpc('get_teacher_login_email', rpcParams);

        if (rpcError || !teacherEmail) {
          toast({
            variant: "destructive",
            title: "Login failed",
            description: "Invalid Teacher ID. Please check and try again.",
          });
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(teacherEmail, staffForm.password);
        if (error) {
          toast({
            variant: "destructive",
            title: "Login failed",
            description: "Invalid password. Please try again.",
          });
        }
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: "An error occurred. Please try again.",
        });
      }
    }
    
    setIsLoading(false);
  };

  // Parent/Student Login with Student ID
  const handleParentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    try {
      parentLoginSchema.parse(parentForm);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    // School selection required if schools exist
    if (schools.length > 0 && !selectedSchoolId) {
      setErrors({ school: 'Please select your school' });
      return;
    }

    setIsLoading(true);
    
    try {
      const rpcParams: any = { student_identifier: parentForm.studentId };
      if (selectedSchoolId) {
        rpcParams._school_id = selectedSchoolId;
      }

      const { data: parentEmail, error: rpcError } = await supabase
        .rpc('get_parent_login_email', rpcParams);

      if (rpcError || !parentEmail) {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: "Invalid Student ID. Please check and try again.",
        });
        setIsLoading(false);
        return;
      }

      const { error } = await signIn(parentEmail, parentForm.password);
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: "Invalid password. Please try again.",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "An error occurred. Please try again.",
      });
    }
    
    setIsLoading(false);
  };

  // Admin Signup (only shown when no admins exist)
  const handleAdminSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    try {
      adminSignupSchema.parse(signupForm);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setIsLoading(true);
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupForm.email,
        password: signupForm.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: signupForm.fullName },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create account');

      toast({ 
        title: 'Account Created!', 
        description: 'Logging you in...' 
      });
      
      setHasAdmins(true);
      setSignupForm({ email: '', password: '', fullName: '' });
      
      await signIn(signupForm.email, signupForm.password);
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Signup Failed', 
        description: error.message 
      });
    }
    
    setIsLoading(false);
  };

  // School selector component
  const SchoolSelector = () => {
    if (loadingSchools || schools.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <Label htmlFor="school-select">
          <div className="flex items-center gap-2">
            <School className="h-4 w-4 text-muted-foreground" />
            Select Your School
          </div>
        </Label>
        <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
          <SelectTrigger id="school-select">
            <SelectValue placeholder="Choose your school..." />
          </SelectTrigger>
          <SelectContent>
            {schools.map((school) => (
              <SelectItem key={school.id} value={school.id}>
                <span className="flex flex-col items-start">
                  <span>{school.name} ({school.code})</span>
                  {school.address && (
                    <span className="text-xs text-muted-foreground">{school.address}</span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.school && <p className="text-sm text-destructive">{errors.school}</p>}
      </div>
    );
  };

  if (loading || checkingAdmins) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4 py-8">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-primary/10 mb-4">
            <GraduationCap className="h-10 w-10 text-primary" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">SmartEduConnect</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">School Management System</p>
        </div>

        {/* Single Card for Auth */}
        <Card className="card-elevated">
          {/* Show Admin Signup if no admins exist */}
          {!hasAdmins ? (
            <>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="font-display text-xl">Welcome to SmartEduConnect</CardTitle>
                <CardDescription>Create the Super Admin account to get started</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdminSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="admin-name"
                        placeholder="Principal Name"
                        className="pl-10"
                        value={signupForm.fullName}
                        onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                      />
                    </div>
                    {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="admin-email"
                        type="email"
                        placeholder="admin@school.com"
                        className="pl-10"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                      />
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="admin-password"
                        type="password"
                        placeholder="Create password"
                        className="pl-10"
                        value={signupForm.password}
                        onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      />
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>

                  <Button type="submit" className="w-full gradient-primary" disabled={isLoading}>
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Create Super Admin Account
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              {/* Login Mode Tabs */}
              <div className="flex rounded-t-lg bg-muted/50 border-b">
                <button
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all border-b-2 ${
                    loginMode === 'staff' 
                      ? 'border-primary text-primary bg-background' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setLoginMode('staff')}
                >
                  <Briefcase className="h-4 w-4" />
                  <span>Staff Login</span>
                </button>
                <button
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all border-b-2 ${
                    loginMode === 'parent' 
                      ? 'border-primary text-primary bg-background' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setLoginMode('parent')}
                >
                  <Users className="h-4 w-4" />
                  <span>Parent / Student</span>
                </button>
              </div>

              <CardHeader className="text-center pb-4 pt-6">
                <CardTitle className="font-display text-xl">
                  {loginMode === 'staff' ? 'Staff Portal' : 'Parent & Student Portal'}
                </CardTitle>
                <CardDescription className="text-sm">
                  {loginMode === 'staff' 
                    ? 'Admin: Email | Teacher: Teacher ID' 
                    : 'Login with Student ID provided by teacher'}
                </CardDescription>
              </CardHeader>

              <CardContent>
                {loginMode === 'staff' ? (
                  <form onSubmit={handleStaffLogin} className="space-y-4">
                    {/* School Selector - shown for teacher ID login when schools exist */}
                    <SchoolSelector />

                    <div className="space-y-2">
                      <Label htmlFor="staff-id">Email or Teacher ID</Label>
                      <div className="relative">
                        <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="staff-id"
                          type="text"
                          placeholder="admin@school.com or JOHN-MATH"
                          className="pl-10"
                          value={staffForm.identifier}
                          onChange={(e) => setStaffForm({ ...staffForm, identifier: e.target.value })}
                        />
                      </div>
                      {errors.identifier && <p className="text-sm text-destructive">{errors.identifier}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="staff-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="staff-password"
                          type="password"
                          placeholder="Enter password"
                          className="pl-10"
                          value={staffForm.password}
                          onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                        />
                      </div>
                      {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                    </div>

                    <Button type="submit" className="w-full gradient-primary" disabled={isLoading}>
                      {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Sign In
                    </Button>

                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground text-center">
                        <strong>Admin:</strong> Use your email address<br />
                        <strong>Teacher:</strong> Select school, then use Teacher ID
                      </p>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleParentLogin} className="space-y-4">
                    {/* School Selector */}
                    <SchoolSelector />

                    <div className="space-y-2">
                      <Label htmlFor="student-id">Student ID / Admission Number</Label>
                      <div className="relative">
                        <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="student-id"
                          type="text"
                          placeholder="e.g., JOHN-10-A"
                          className="pl-10"
                          value={parentForm.studentId}
                          onChange={(e) => setParentForm({ ...parentForm, studentId: e.target.value })}
                        />
                      </div>
                      {errors.studentId && <p className="text-sm text-destructive">{errors.studentId}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="parent-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="parent-password"
                          type="password"
                          placeholder="Enter password"
                          className="pl-10"
                          value={parentForm.password}
                          onChange={(e) => setParentForm({ ...parentForm, password: e.target.value })}
                        />
                      </div>
                      {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full gradient-parent" 
                      disabled={isLoading}
                    >
                      {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Sign In
                    </Button>

                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground text-center">
                        Select your school, then use Student ID and password provided by the teacher.
                      </p>
                    </div>
                  </form>
                )}
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
