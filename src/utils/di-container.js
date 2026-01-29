/**
 * Dependency Injection Container
 * Enterprise-grade IoC container with lifecycle management
 *
 * Features:
 * - Service registration and resolution
 * - Singleton and transient lifetimes
 * - Automatic dependency resolution
 * - Circular dependency detection
 * - Service factories
 * - Lifecycle hooks (onInit, onDispose)
 *
 * @version 1.0.0
 * @module utils/di-container
 */

class DIContainer {
  constructor() {
    this.services = new Map();
    this.instances = new Map();
    this.resolving = new Set();
  }

  /**
   * Register a service
   * @param {string} name - Service name
   * @param {Function} factory - Service factory function
   * @param {Object} options - Registration options
   */
  register(name, factory, options = {}) {
    const {
      lifetime = 'singleton', // singleton | transient
      dependencies = [],
      onInit = null,
      onDispose = null
    } = options;

    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }

    this.services.set(name, {
      name,
      factory,
      lifetime,
      dependencies,
      onInit,
      onDispose
    });

    console.log(`📦 Registered service: ${name} (${lifetime})`);
  }

  /**
   * Register a singleton service
   */
  registerSingleton(name, factory, dependencies = []) {
    this.register(name, factory, { lifetime: 'singleton', dependencies });
  }

  /**
   * Register a transient service
   */
  registerTransient(name, factory, dependencies = []) {
    this.register(name, factory, { lifetime: 'transient', dependencies });
  }

  /**
   * Register a value
   */
  registerValue(name, value) {
    this.instances.set(name, value);
    console.log(`📦 Registered value: ${name}`);
  }

  /**
   * Resolve a service
   */
  resolve(name) {
    // Check if value is registered
    if (this.instances.has(name) && !this.services.has(name)) {
      return this.instances.get(name);
    }

    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' is not registered`);
    }

    // Check for circular dependencies
    if (this.resolving.has(name)) {
      throw new Error(`Circular dependency detected: ${name}`);
    }

    // Return existing singleton instance
    if (service.lifetime === 'singleton' && this.instances.has(name)) {
      return this.instances.get(name);
    }

    this.resolving.add(name);

    try {
      // Resolve dependencies
      const deps = service.dependencies.map((dep) => this.resolve(dep));

      // Create instance
      const instance = service.factory(...deps);

      // Store singleton instance
      if (service.lifetime === 'singleton') {
        this.instances.set(name, instance);
      }

      // Call onInit hook
      if (service.onInit && typeof instance[service.onInit] === 'function') {
        instance[service.onInit]();
      }

      this.resolving.delete(name);
      return instance;
    } catch (error) {
      this.resolving.delete(name);
      throw new Error(`Failed to resolve service '${name}': ${error.message}`);
    }
  }

  /**
   * Check if service is registered
   */
  has(name) {
    return this.services.has(name) || this.instances.has(name);
  }

  /**
   * Dispose a service
   */
  async dispose(name) {
    const service = this.services.get(name);
    const instance = this.instances.get(name);

    if (instance && service && service.onDispose) {
      if (typeof instance[service.onDispose] === 'function') {
        await instance[service.onDispose]();
      }
    }

    this.instances.delete(name);
    console.log(`🗑️  Disposed service: ${name}`);
  }

  /**
   * Dispose all services
   */
  async disposeAll() {
    const names = Array.from(this.instances.keys());
    for (const name of names) {
      await this.dispose(name);
    }
    console.log('🗑️  Disposed all services');
  }

  /**
   * Get all registered service names
   */
  getServiceNames() {
    return Array.from(this.services.keys());
  }

  /**
   * Get service metadata
   */
  getServiceMetadata(name) {
    const service = this.services.get(name);
    if (!service) {
      return null;
    }

    return {
      name: service.name,
      lifetime: service.lifetime,
      dependencies: service.dependencies,
      isResolved: this.instances.has(name)
    };
  }

  /**
   * Clear all registrations
   */
  clear() {
    this.services.clear();
    this.instances.clear();
    this.resolving.clear();
    console.log('🧹 Cleared all registrations');
  }
}

// Export singleton instance
module.exports = new DIContainer();
