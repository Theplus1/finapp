"use client"

import { LoginForm } from "@/components/auth/login-form"
import { useMutation } from "@tanstack/react-query"
import { api, ApiResponse, AuthResponse } from "@/lib/api"
import { useRouter } from "next/navigation"

export default function Page() {
  const router = useRouter()
  
  const loginMutation = useMutation({
    mutationFn: api.auth.login,
    onError: (error) => {
      console.log('Login failed:', error)
    },
    onSuccess: (response: ApiResponse<AuthResponse>) => {
      localStorage.setItem('auth_token', response.data.token)
      router.push('/dashboard')
    },
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    loginMutation.mutate({ email, password })
  }

  return (
    <LoginForm 
      onSubmit={handleSubmit} 
      loading={loginMutation.isPending} 
      error={loginMutation.error?.message} 
    />
  )
}
