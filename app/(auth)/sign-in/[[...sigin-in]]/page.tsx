"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Github } from "lucide-react";
import { Slide, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Loader from "@/components/Loader";
import { Button } from "@/components/ui/button";

const SignInPage = () => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    localStorage.removeItem("hasShownWelcome");
  }, []);

  const showToasts = (message: string, type: "info" | "error" | "success" = "info") => {
    toast[type](message, {
      position: "top-right",
      autoClose: 3000,
      transition: Slide,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      style: {
        backgroundColor: "#000",
        color: "#fff",
        fontWeight: "bold",
        borderRadius: "10px",
        padding: "12px",
        textAlign: "center",
        fontSize: "16px",
      },
    });
  };

  const handleLogin = async (provider: "google" | "github") => {
    setIsLoading(true);
    try {
      showToasts(`🔄 Logging in with ${provider}...`, "info");
      await signIn(provider, { callbackUrl: "/" });
    } catch (error) {
      showToasts(`❌ Failed to login with ${provider}, please try again`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    isLoading ? <Loader /> : 
    <div className="flex min-h-screen bg-gradient-to-br from-black via-[#0f172a] to-[#0b1324] text-white">
      <div className="hidden w-1/2 lg:block">
        <Image
          src="/icons/Cmmockup.svg"
          width={1080}
          height={1080}
          alt="login_image"
          className="object-cover w-full h-full"
        />
      </div>
      <div className="flex flex-col justify-center w-full p-8 lg:w-1/2">
        <div className="max-w-md mx-auto">
          <h1 className="mb-8 text-4xl font-bold">Welcome to <b>CyberShoora Meet</b></h1>
          <p className="mb-10 text-gray-200">
            Connect with your team anytime, anywhere. Join or start meetings with crystal-clear HD video and audio.
          </p>
          <div className="space-y-4">
            <Button
              className="w-full border border-slate-600 bg-[#0b1324]/60 text-white hover:bg-[#111827]"
              variant="outline"
              onClick={() => handleLogin("google")}
            >
              <svg
                className="w-5 h-5 mr-2"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Login with Google
            </Button>
          </div>
          <div className="flex flex-col space-y-8 mt-8">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-1/2 mr-8 border-t border-slate-600"></span>
                <span className="w-1/2 ml-8 border-t border-slate-600"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-transparent px-2 text-gray-300">Or</span>
              </div>
            </div>
            <Button
              className="w-full bg-white text-black hover:bg-slate-200"
              variant="ghost"
              onClick={() => handleLogin("github")}
            >
              <Github className="w-5 h-5 mr-2" />
              Login with Github
            </Button>
            <p className="text-sm text-center text-gray-300">
              Don&apos;t have an account?{" "}
              <Link href="https://accounts.google.com" target="_blank" className="text-blue-400 hover:underline">
                Create now
              </Link>
            </p>
          </div>
        </div>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        draggable
        transition={Slide}
        theme="dark"
        limit={3}
      />
    </div>
  );
};

export default SignInPage;
