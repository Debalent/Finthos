import React, { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon, BellIcon } from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'

interface NavLink {
  label: string
  href: string
  roles: string[]
}

interface NavBarProps {
  userRole?: 'admin' | 'user' | 'guest'
  onLogout?: () => void
  onNotifications?: () => void
  logoSrc?: string
  className?: string
}

const navLinks: NavLink[] = [
  { label: 'Dashboard', href: '/dashboard', roles: ['admin', 'user'] },
  { label: 'Send', href: '/send', roles: ['admin', 'user'] },
  { label: 'Request', href: '/request', roles: ['admin', 'user'] },
  { label: 'Transactions', href: '/transactions', roles: ['admin', 'user'] },
  { label: 'Profile', href: '/profile', roles: ['admin', 'user'] },
  { label: 'Admin Panel', href: '/admin', roles: ['admin'] },
]

const exploreItems = [
  {
    title: 'Send Money',
    description: 'Quickly send money to friends and family.',
    href: '/send',
    image: '/assets/send-money.jpg'
  },
  {
    title: 'Request Payment',
    description: 'Create and share payment requests.',
    href: '/request',
    image: '/assets/request-payment.jpg'
  },
  {
    title: 'Transactions',
    description: 'Review recent activity and exports.',
    href: '/transactions',
    image: '/assets/transactions.jpg'
  }
]

export const NavBar: React.FC<NavBarProps> = ({
  userRole = 'user',
  onLogout,
  onNotifications,
  logoSrc = '/assets/FinthosLogo.jpg',
  className = ''
}) => {
  const [isExploreOpen, setIsExploreOpen] = useState(false)
  const [isUserOpen, setIsUserOpen] = useState(false)
  const [currentExploreIndex, setCurrentExploreIndex] = useState(0)
  const router = useRouter()
  
  const exploreRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  // Filter nav links based on user role
  const filteredNavLinks = navLinks.filter(link => link.roles.includes(userRole))

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exploreRef.current && !exploreRef.current.contains(event.target as Node)) {
        setIsExploreOpen(false)
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setIsUserOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePrevExplore = () => {
    setCurrentExploreIndex((prev) => 
      prev === 0 ? exploreItems.length - 1 : prev - 1
    )
  }

  const handleNextExplore = () => {
    setCurrentExploreIndex((prev) => 
      prev === exploreItems.length - 1 ? 0 : prev + 1
    )
  }

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    } else {
      // Default logout behavior
      localStorage.removeItem('Finthos_token')
      localStorage.removeItem('Finthos_role')
      router.push('/login')
    }
  }

  const handleNotifications = () => {
    if (onNotifications) {
      onNotifications()
    } else {
      // Default notification behavior
      console.log('No new notifications')
    }
  }

  return (
    <nav className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo and main navigation */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image 
                src={logoSrc} 
                alt="Finthos" 
                width={32} 
                height={32}
                className="rounded-md"
              />
              <span className="font-semibold text-lg text-gray-900">Finthos</span>
            </Link>
            
            <nav className="ml-8" aria-label="Primary navigation">
              <ul className="flex items-center gap-6">
                {filteredNavLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`text-sm font-medium transition-colors duration-200 ${
                        router.pathname === link.href
                          ? 'text-blue-600'
                          : 'text-gray-700 hover:text-blue-600'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button
              onClick={handleNotifications}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
              aria-label="Notifications"
            >
              <BellIcon className="h-5 w-5" />
            </button>

            {/* Explore dropdown */}
            <div className="relative" ref={exploreRef}>
              <button
                onClick={() => setIsExploreOpen(!isExploreOpen)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
              >
                Explore
                <ChevronDownIcon className="h-4 w-4" />
              </button>

              <AnimatePresence>
                {isExploreOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50"
                  >
                    <div className="relative">
                      <motion.div
                        key={currentExploreIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3"
                      >
                        <div className="relative h-36 rounded-md overflow-hidden">
                          <Image
                            src={exploreItems[currentExploreIndex].image}
                            alt={exploreItems[currentExploreIndex].title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {exploreItems[currentExploreIndex].title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {exploreItems[currentExploreIndex].description}
                          </p>
                          <Link
                            href={exploreItems[currentExploreIndex].href}
                            className="inline-block mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors duration-200"
                            onClick={() => setIsExploreOpen(false)}
                          >
                            Open
                          </Link>
                        </div>
                      </motion.div>
                      
                      <div className="flex justify-between mt-4">
                        <button
                          onClick={handlePrevExplore}
                          className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                        >
                          ← Prev
                        </button>
                        <div className="flex gap-1">
                          {exploreItems.map((_, index) => (
                            <button
                              key={index}
                              title={`Go to slide ${index + 1}`}
                              onClick={() => setCurrentExploreIndex(index)}
                              className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                                index === currentExploreIndex ? 'bg-blue-600' : 'bg-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <button
                          onClick={handleNextExplore}
                          className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User dropdown */}
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setIsUserOpen(!isUserOpen)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors duration-200"
              >
                Account
                <ChevronDownIcon className="h-4 w-4" />
              </button>

              <AnimatePresence>
                {isUserOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50"
                  >
                    <Link
                      href="/profile"
                      className="block px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 transition-colors duration-200"
                      onClick={() => setIsUserOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 transition-colors duration-200"
                    >
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default NavBar
