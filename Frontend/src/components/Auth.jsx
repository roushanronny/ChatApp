import axios from "axios";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthProvider";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import { getApiUrl } from "../config/api.js";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function Auth() {
  const [authUser, setAuthUser] = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  // Default to signup mode (signup form on right)
  const [isSignUp, setIsSignUp] = useState(location.pathname !== "/login");
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Loading states
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  
  // Redirect to home if already logged in
  useEffect(() => {
    if (authUser) {
      navigate("/", { replace: true });
    }
  }, [authUser, navigate]);
  
  // Update mode when route changes
  useEffect(() => {
    setIsSignUp(location.pathname !== "/login");
  }, [location.pathname]);

  // Separate form instances for login and signup
  const loginForm = useForm({
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldUnregister: false, // Keep values when switching
  });
  
  const signupForm = useForm({
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldUnregister: false, // Keep values when switching
  });

  // Watch password field for signup form to trigger confirm password re-validation
  const signupPassword = signupForm.watch("password");

  // Login handler
  const onLogin = (data) => {
    if (isLoggingIn) return; // Prevent double submission
    
    console.log("Login form data:", data);
    
    const emailOrPhone = (data.email || data.phone || "").trim();
    
    // Validate input
    if (!emailOrPhone) {
      toast.error("Please enter email or phone number");
      return;
    }
    
    if (!data.password) {
      toast.error("Please enter password");
      return;
    }
    
    // Determine if it's email or phone (improved detection)
    const cleanedPhone = emailOrPhone.replace(/\D/g, ""); // Remove all non-digits
    const isEmail = emailOrPhone.includes("@") && emailOrPhone.includes(".");
    const isPhone = cleanedPhone.length >= 10 && /^\d+$/.test(cleanedPhone);
    
    const userInfo = {
      password: String(data.password), // Convert to string, don't trim
    };
    
    // Add email or phone based on input
    if (isEmail) {
      userInfo.email = emailOrPhone.toLowerCase().trim();
    } else if (isPhone) {
      userInfo.phone = cleanedPhone; // Use cleaned phone number
    } else {
      // Try as email if unclear
      userInfo.email = emailOrPhone.toLowerCase().trim();
      console.log("Unclear format, trying as email:", userInfo.email);
    }

    console.log("Sending login request:", { ...userInfo, password: "***" });
    setIsLoggingIn(true);
    
    axios
      .post(getApiUrl("/api/user/login"), userInfo, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        }
      })
      .then((response) => {
        console.log("Login response:", response.data);
        setIsLoggingIn(false);
        
        if (response.data && response.data.user) {
          toast.success("Login successful");
          
          // Save token
          if (response.data.token) {
            Cookies.set("jwt", response.data.token, { expires: 10 });
          }
          
          // Save complete response data to localStorage
          const userData = {
            ...response.data,
            token: response.data.token
          };
          localStorage.setItem("ChatApp", JSON.stringify(userData));
          setAuthUser(userData);
          
          // Navigate to home page after successful login
          setTimeout(() => {
            navigate("/", { replace: true });
          }, 300);
        } else {
          console.error("Invalid response structure:", response.data);
          toast.error("Invalid response from server");
        }
      })
      .catch((error) => {
        setIsLoggingIn(false);
        console.error("Login error details:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        
        if (error.response) {
          const errorMsg = error.response.data?.error || error.response.data?.message || "Login failed. Please check your credentials.";
          toast.error(errorMsg);
        } else if (error.request) {
          toast.error("Network error. Please check your internet connection.");
        } else {
          toast.error("An error occurred. Please try again.");
        }
      });
  };

  // Password validation function - use getValues to get current form values
  const validatePasswordMatch = (value) => {
    // Get current password value from signup form using getValues
    const passwordValue = signupForm.getValues("password") || "";
    const confirmValue = value || "";
    
    // If confirm password is empty, don't show match error yet
    if (!confirmValue) {
      return true; // Let required validation handle empty field
    }
    
    // If password is not set yet, allow it (will validate later)
    if (!passwordValue) {
      return true;
    }
    
    // Trim and compare values
    const trimmedPassword = String(passwordValue).trim();
    const trimmedConfirm = String(confirmValue).trim();
    
    // Compare values
    if (trimmedPassword !== trimmedConfirm) {
      return "Passwords do not match";
    }
    
    return true;
  };

  // Signup handler
  const onSignup = (data) => {
    if (isSigningUp) return; // Prevent double submission
    
    // Final validation before submit
    const passwordValue = (data.password || "").trim();
    const confirmPasswordValue = (data.confirmPassword || "").trim();
    
    if (!passwordValue || !confirmPasswordValue) {
      toast.error("Please fill both password fields");
      return;
    }
    
    if (passwordValue !== confirmPasswordValue) {
      toast.error("Passwords do not match");
      return;
    }

    const userInfo = {
      fullname: data.fullname.trim(),
      email: data.email.trim(),
      phone: (data.phone || "").trim(),
      password: passwordValue,
      confirmPassword: confirmPasswordValue,
    };

    setIsSigningUp(true);
    axios
      .post(getApiUrl("/api/user/signup"), userInfo, {
        withCredentials: true,
      })
      .then((response) => {
        setIsSigningUp(false);
        if (response.data) {
          toast.success("Account created successfully! Please login with your credentials.");
          // Pre-fill email in login form
          loginForm.setValue("email", data.email.trim());
          // Reset signup form
          signupForm.reset();
          // Switch to login form
          setTimeout(() => {
            setIsSignUp(false);
          }, 300);
        }
      })
      .catch((error) => {
        setIsSigningUp(false);
        if (error.response) {
          const errorMsg = error.response.data?.error || error.response.data?.message || "Signup failed";
          toast.error("Error: " + errorMsg);
        } else {
          toast.error("Network error. Please try again.");
        }
      });
  };

  const switchMode = (mode) => {
    setIsSignUp(mode);
    // Don't reset forms when switching - preserve user input
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Side - Light Brown Background */}
      <div
        className={`w-1/3 bg-gradient-to-br from-brown-primary to-brown-dark flex flex-col items-center justify-center px-12 text-white relative overflow-hidden transition-all duration-500 ${
          isSignUp ? "translate-x-0" : ""
        }`}
      >
        {/* Decorative shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
        </div>

        <div className="relative z-10 text-center">
          <div className="space-y-8">
            {!isSignUp ? (
              <>
                {/* Login form is showing on white side */}
                <div>
                  <h1 className="text-5xl font-bold mb-4">Welcome Back!</h1>
                  <p className="text-lg mb-8 text-white/90">
                    To keep connected with us please login with your personal info
                  </p>
                </div>
                <div className="space-y-4">
                  {/* Only show SIGN UP button on green side when login is showing on white */}
                  <button
                    onClick={() => switchMode(true)}
                    className="border-2 border-white bg-white/10 px-12 py-3 rounded-full font-semibold hover:bg-white hover:text-brown-primary transition-all duration-300 w-full"
                  >
                    SIGN UP
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Signup form is showing on white side */}
                <div>
                  <h1 className="text-5xl font-bold mb-4">Hello, Friend!</h1>
                  <p className="text-lg mb-8 text-white/90">
                    Enter your personal details and start journey with us
                  </p>
                </div>
                <div className="space-y-4">
                  {/* Only show SIGN IN button on green side when signup is showing on white */}
                  <button
                    onClick={() => switchMode(false)}
                    className="border-2 border-white bg-white/10 px-12 py-3 rounded-full font-semibold hover:bg-white hover:text-brown-primary transition-all duration-300 w-full"
                  >
                    SIGN IN
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Side - White Background with Forms */}
      <div className="flex-1 bg-white flex items-center justify-center px-16 relative overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden">
          <div className="absolute top-10 right-10 w-20 h-20 bg-brown-primary/5 rounded-full blur-xl"></div>
          <div className="absolute bottom-20 left-10 w-32 h-32 bg-brown-primary/5 rounded-full blur-2xl"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Forms Container with sliding animation */}
          <div className="relative overflow-hidden min-h-[600px]">
            {/* Login Form */}
            <div
              className={`transition-all duration-500 ease-in-out ${
                !isSignUp
                  ? "translate-x-0 opacity-100 relative"
                  : "-translate-x-full opacity-0 absolute inset-0 pointer-events-none"
              }`}
              style={{ pointerEvents: !isSignUp ? 'auto' : 'none' }}
            >
              <form
                onSubmit={loginForm.handleSubmit(onLogin)}
                className="space-y-6"
                autoComplete="on"
                method="post"
                noValidate
              >
                <div>
                  <h2 className="text-4xl font-bold text-brown-primary mb-2">
                    Sign in to Chatmate
                  </h2>
                  <p className="text-brown-primary text-sm mb-2 font-medium">BY Roushan Kumar</p>
                  <p className="text-gray-500">or use your email account:</p>
                </div>

                {/* Email or Phone */}
                <div className="form-control w-full">
                  <label className="input input-bordered flex items-center gap-2 w-full cursor-text">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="w-4 h-4 opacity-70 pointer-events-none"
                    >
                      <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z" />
                      <path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z" />
                    </svg>
                    <input
                      type="text"
                      className="grow outline-none border-none bg-transparent text-base-content placeholder:text-base-content/50"
                      placeholder="Email or Phone Number"
                      autoComplete="username"
                      id="login-email"
                      name="login-email"
                      disabled={isLoggingIn}
                      {...loginForm.register("email", { 
                        required: "Email or phone number is required",
                        validate: {
                          validFormat: (value) => {
                            if (!value || value.trim() === "") return true;
                            const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
                            const phonePattern = /^\d{10,}$/;
                            const cleanedValue = value.trim().replace(/\D/g, "");
                            return emailPattern.test(value.trim()) || phonePattern.test(cleanedValue) || "Invalid email or phone number";
                          }
                        }
                      })}
                    />
                  </label>
                </div>
                {(loginForm.formState.errors.email || loginForm.formState.errors.phone) && (
                  <span className="text-red-500 text-sm">{(loginForm.formState.errors.email || loginForm.formState.errors.phone)?.message}</span>
                )}

                {/* Password */}
                <div className="form-control w-full">
                  <label className="input input-bordered flex items-center gap-2 w-full relative cursor-text">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="w-4 h-4 opacity-70 pointer-events-none"
                    >
                      <path
                        fillRule="evenodd"
                        d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      className="grow pr-10 outline-none border-none bg-transparent text-base-content placeholder:text-base-content/50"
                      placeholder="Password"
                      autoComplete="current-password"
                      id="login-password"
                      name="login-password"
                      disabled={isLoggingIn}
                      {...loginForm.register("password", { required: "Password is required" })}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowLoginPassword(!showLoginPassword);
                      }}
                      className="absolute right-3 text-gray-500 hover:text-gray-700 focus:outline-none z-20 bg-transparent border-none cursor-pointer"
                      tabIndex={-1}
                    >
                      {showLoginPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                    </button>
                  </label>
                </div>
                {loginForm.formState.errors.password && (
                  <span className="text-red-500 text-sm">{loginForm.formState.errors.password.message}</span>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-brown-primary text-white py-3 rounded-lg font-semibold hover:bg-brown-dark transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingIn ? "Logging in..." : "SIGN IN"}
                </button>
              </form>
            </div>

            {/* Signup Form */}
            <div
              className={`transition-all duration-500 ease-in-out ${
                isSignUp
                  ? "translate-x-0 opacity-100 relative"
                  : "translate-x-full opacity-0 absolute inset-0 pointer-events-none"
              }`}
            >
              <form
                onSubmit={signupForm.handleSubmit(onSignup)}
                className="space-y-6"
                autoComplete="on"
                method="post"
                noValidate
              >
                <div>
                  <h2 className="text-4xl font-bold text-brown-primary mb-2">
                    Create Account
                  </h2>
                  <p className="text-gray-500">or use your email for registration:</p>
                </div>

                {/* Name */}
                <label className="input input-bordered flex items-center gap-2 w-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="w-4 h-4 opacity-70"
                  >
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z" />
                  </svg>
                  <input
                    type="text"
                    className="grow"
                    placeholder="Name"
                    autoComplete="name"
                    {...signupForm.register("fullname", { required: "Name is required" })}
                  />
                </label>
                {signupForm.formState.errors.fullname && (
                  <span className="text-red-500 text-sm">{signupForm.formState.errors.fullname.message}</span>
                )}

                {/* Email */}
                <label className="input input-bordered flex items-center gap-2 w-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="w-4 h-4 opacity-70"
                  >
                    <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z" />
                    <path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z" />
                  </svg>
                  <input
                    type="email"
                    className="grow"
                    placeholder="Email"
                    autoComplete="email"
                    id="signup-email"
                    name="email"
                    {...signupForm.register("email", { required: "Email is required" })}
                  />
                </label>
                {signupForm.formState.errors.email && (
                  <span className="text-red-500 text-sm">{signupForm.formState.errors.email.message}</span>
                )}

                {/* Phone (Optional) */}
                <label className="input input-bordered flex items-center gap-2 w-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="w-4 h-4 opacity-70"
                  >
                    <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122L9.65 12.19a.678.678 0 0 1-.654-.284l-2.72-3.437a.678.678 0 0 1-.284-.654l.252-1.303a.678.678 0 0 0-.122-.58L3.654 1.328Z" />
                  </svg>
                  <input
                    type="tel"
                    className="grow"
                    placeholder="Phone Number (Optional)"
                    autoComplete="tel"
                    {...signupForm.register("phone", {
                      validate: (value) => {
                        if (!value || value.trim() === "") return true; // Optional field
                        const phonePattern = /^\d{10,}$/;
                        const cleanedValue = value.trim().replace(/\D/g, "");
                        return phonePattern.test(cleanedValue) || "Phone number must be at least 10 digits";
                      }
                    })}
                  />
                </label>
                {signupForm.formState.errors.phone && (
                  <span className="text-red-500 text-sm">{signupForm.formState.errors.phone.message}</span>
                )}

                {/* Password */}
                <label className="input input-bordered flex items-center gap-2 w-full relative">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="w-4 h-4 opacity-70"
                  >
                    <path
                      fillRule="evenodd"
                      d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="grow pr-10"
                    placeholder="Password"
                    autoComplete="new-password"
                    {...signupForm.register("password", { 
                      required: "Password is required",
                      onChange: () => {
                        // Trigger confirm password validation when password changes
                        signupForm.trigger("confirmPassword");
                      }
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                </label>
                {signupForm.formState.errors.password && (
                  <span className="text-red-500 text-sm">{signupForm.formState.errors.password.message}</span>
                )}

                {/* Confirm Password */}
                <label className="input input-bordered flex items-center gap-2 w-full relative">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="w-4 h-4 opacity-70"
                  >
                    <path
                      fillRule="evenodd"
                      d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="grow pr-10"
                    placeholder="Confirm Password"
                    autoComplete="new-password"
                    id="signup-confirm-password"
                    name="confirmPassword"
                    {...signupForm.register("confirmPassword", { 
                      required: "Please confirm password",
                      validate: validatePasswordMatch
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showConfirmPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                </label>
                {signupForm.formState.errors.confirmPassword && (
                  <span className="text-red-500 text-sm">{signupForm.formState.errors.confirmPassword.message}</span>
                )}

                <button
                  type="submit"
                  disabled={isSigningUp}
                  className="w-full bg-brown-primary text-white py-3 rounded-lg font-semibold hover:bg-brown-dark transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningUp ? "Creating Account..." : "SIGN UP"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;

