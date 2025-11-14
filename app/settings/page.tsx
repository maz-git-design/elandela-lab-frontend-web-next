'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getDataSourceConfig, setDataSourceConfig, DataSourceType } from '@/lib/config/data-source'
import { User, Mail, Lock, Save, AlertTriangle, Database, Server, Globe, Settings } from 'lucide-react'
import { getCurrentUserProfile, UserRole } from '@/lib/auth/roles'
import { useTranslation } from '@/lib/i18n/use-translation'

export default function SettingsPage() {
  const { t, language, changeLanguage } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [profile, setProfile] = useState({
    email: '',
    full_name: '',
  })
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  })
  const [dataSource, setDataSource] = useState<DataSourceType>('supabase')
  const [apiUrl, setApiUrl] = useState('')
  const [dataSourceMessage, setDataSourceMessage] = useState('')
  const [userRole, setUserRole] = useState<UserRole>('user')
  const [ldapConfig, setLdapConfig] = useState({
    server: '',
    port: '389',
    baseDn: '',
    bindDn: '',
    bindPassword: '',
    enabled: false,
  })
  const [ldapMessage, setLdapMessage] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const profile = await getCurrentUserProfile()
      if (profile) {
        setUserRole(profile.role)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle()

        setProfile({
          email: user.email || '',
          full_name: data?.full_name || '',
        })
      }

      const config = getDataSourceConfig()
      setDataSource(config.type)
      setApiUrl(config.apiBaseUrl || '')
    }
    init()
  }, [])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: profile.full_name })
        .eq('id', user.id)

      if (error) throw error

      setMessage('Profile updated successfully')
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (passwords.new !== passwords.confirm) {
      setMessage('New passwords do not match')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      })

      if (error) throw error

      setMessage('Password updated successfully')
      setPasswords({ current: '', new: '', confirm: '' })
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmation = prompt('This action cannot be undone. Type "DELETE" to confirm:')
    if (confirmation !== 'DELETE') {
      setMessage('Account deletion cancelled')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      await supabase.from('profiles').delete().eq('id', user.id)
      await supabase.auth.signOut()
      window.location.href = '/auth/login'
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Failed to delete account')
      setLoading(false)
    }
  }

  const handleDataSourceSave = () => {
    setDataSourceMessage('')

    if (dataSource === 'api' && !apiUrl.trim()) {
      setDataSourceMessage('Please enter an API URL')
      return
    }

    setDataSourceConfig({
      type: dataSource,
      apiBaseUrl: dataSource === 'api' ? apiUrl : undefined,
    })

    setDataSourceMessage('Data source configuration saved successfully. Refresh the page to apply changes.')
  }

  const handleLanguageChange = (newLanguage: 'en' | 'fr') => {
    changeLanguage(newLanguage)
    setMessage(newLanguage === 'en' ? 'Language preference saved.' : 'Préférence de langue enregistrée.')
  }

  const handleLdapSave = () => {
    setLdapMessage('')
    localStorage.setItem('ldapConfig', JSON.stringify(ldapConfig))
    setLdapMessage('LDAP configuration saved successfully.')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('settings', 'title')}</h1>
          <p className="text-gray-600 mt-1">{t('settings', 'subtitle')}</p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${
            message.includes('success') || message.includes('saved')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <Card className="border-gray-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <CardTitle>{t('settings', 'language')}</CardTitle>
            </div>
            <CardDescription>{language === 'en' ? 'Choose your preferred language' : 'Choisissez votre langue préférée'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">{language === 'en' ? 'Language' : 'Langue'}</Label>
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">
                      <div className="flex items-center gap-2">
                        <span>🇬🇧</span>
                        <span>English</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="fr">
                      <div className="flex items-center gap-2">
                        <span>🇫🇷</span>
                        <span>Français</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {userRole === 'super_admin' && (
          <Card className="border-gray-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                <CardTitle>LDAP Configuration</CardTitle>
              </div>
              <CardDescription>Configure LDAP/Active Directory integration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ldapMessage && (
                  <div className="p-4 rounded-lg bg-green-50 text-green-800 border border-green-200">
                    {ldapMessage}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ldap_enabled"
                      checked={ldapConfig.enabled}
                      onChange={(e) => setLdapConfig({ ...ldapConfig, enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="ldap_enabled">Enable LDAP Authentication</Label>
                  </div>
                </div>

                {ldapConfig.enabled && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ldap_server">LDAP Server</Label>
                        <Input
                          id="ldap_server"
                          value={ldapConfig.server}
                          onChange={(e) => setLdapConfig({ ...ldapConfig, server: e.target.value })}
                          className="border-gray-200"
                          placeholder="ldap.example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ldap_port">Port</Label>
                        <Input
                          id="ldap_port"
                          value={ldapConfig.port}
                          onChange={(e) => setLdapConfig({ ...ldapConfig, port: e.target.value })}
                          className="border-gray-200"
                          placeholder="389"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ldap_base_dn">Base DN</Label>
                      <Input
                        id="ldap_base_dn"
                        value={ldapConfig.baseDn}
                        onChange={(e) => setLdapConfig({ ...ldapConfig, baseDn: e.target.value })}
                        className="border-gray-200"
                        placeholder="dc=example,dc=com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ldap_bind_dn">Bind DN</Label>
                      <Input
                        id="ldap_bind_dn"
                        value={ldapConfig.bindDn}
                        onChange={(e) => setLdapConfig({ ...ldapConfig, bindDn: e.target.value })}
                        className="border-gray-200"
                        placeholder="cn=admin,dc=example,dc=com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ldap_bind_password">Bind Password</Label>
                      <Input
                        id="ldap_bind_password"
                        type="password"
                        value={ldapConfig.bindPassword}
                        onChange={(e) => setLdapConfig({ ...ldapConfig, bindPassword: e.target.value })}
                        className="border-gray-200"
                        placeholder="••••••••"
                      />
                    </div>
                  </>
                )}

                <Button onClick={handleLdapSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save LDAP Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {userRole === 'super_admin' && (
          <Card className="border-gray-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              <CardTitle>Data Source Configuration</CardTitle>
            </div>
            <CardDescription>Choose between Supabase database or your remote NestJS API</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dataSourceMessage && (
                <div className={`p-4 rounded-lg ${
                  dataSourceMessage.includes('success')
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                }`}>
                  {dataSourceMessage}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="dataSource">Data Source</Label>
                <Select value={dataSource} onValueChange={(value) => setDataSource(value as DataSourceType)}>
                  <SelectTrigger className="border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supabase">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <span>Supabase Database</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="api">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        <span>Remote API (NestJS)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dataSource === 'api' && (
                <div className="space-y-2">
                  <Label htmlFor="apiUrl">API Base URL</Label>
                  <Input
                    id="apiUrl"
                    type="url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="border-gray-200"
                    placeholder="https://api.example.com"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Enter the base URL of your NestJS API server
                  </p>
                </div>
              )}

              <Button onClick={handleDataSourceSave} className="gap-2">
                <Save className="h-4 w-4" />
                Save Data Source
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        <Card className="border-gray-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <CardTitle>{t('settings', 'profile')}</CardTitle>
            </div>
            <CardDescription>{language === 'en' ? 'Update your personal information' : 'Mettre à jour vos informations personnelles'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="flex-1 border-gray-200"
                  />
                </div>
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  type="text"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="border-gray-200"
                  placeholder="Enter your full name"
                />
              </div>

              <Button type="submit" disabled={loading} className="gap-2">
                <Save className="h-4 w-4" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" />
              <CardTitle>Change Password</CardTitle>
            </div>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  className="border-gray-200"
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  className="border-gray-200"
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="gap-2">
                <Lock className="h-4 w-4" />
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-900">Danger Zone</CardTitle>
            </div>
            <CardDescription className="text-red-700">
              Irreversible actions that will permanently affect your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-lg border border-red-200">
                <h3 className="font-semibold text-gray-900 mb-2">Delete Account</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Once you delete your account, there is no going back. All your data will be permanently removed.
                </p>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Delete My Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
