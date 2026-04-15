import { Injectable } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class CookieStorageService {
  private cookieSource(): string {
    if (typeof document === 'undefined') {
      return ''
    }

    return document.cookie
  }

  private writeCookie(cookieValue: string) {
    if (typeof document === 'undefined') {
      return
    }

    document.cookie = cookieValue
  }

  private secureAttribute() {
    if (typeof window === 'undefined') {
      return ''
    }

    return window.location.protocol === 'https:' ? '; Secure' : ''
  }

  private domainAttribute() {
    if (typeof window === 'undefined') {
      return ''
    }

    const hostname = window.location.hostname.toLowerCase()

    if (hostname === 'steinente.de' || hostname.endsWith('.steinente.de')) {
      return '; Domain=.steinente.de'
    }

    return ''
  }

  get(key: string): string | null {
    const encodedKey = encodeURIComponent(key)
    const encodedCookiePrefix = `${encodedKey}=`
    const cookiePart = this.cookieSource()
      .split(';')
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(encodedCookiePrefix))

    if (!cookiePart) {
      return null
    }

    const encodedValue = cookiePart.slice(encodedCookiePrefix.length)

    try {
      return decodeURIComponent(encodedValue)
    } catch {
      return null
    }
  }

  set(key: string, value: string) {
    const encodedKey = encodeURIComponent(key)
    const encodedValue = encodeURIComponent(value)

    this.writeCookie(
      `${encodedKey}=${encodedValue}; Path=/; Max-Age=31536000; SameSite=Lax${this.domainAttribute()}${this.secureAttribute()}`,
    )
  }

  remove(key: string) {
    const encodedKey = encodeURIComponent(key)

    this.writeCookie(
      `${encodedKey}=; Path=/; Max-Age=0; SameSite=Lax${this.domainAttribute()}${this.secureAttribute()}`,
    )
  }
}
