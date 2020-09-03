/**
 * JavaScript Document
 * Version: 1.0.0
 * Date: 8/31/2020
 * Author: Liu Changkun
 * Copyright: www.east.net
 */

import _ from "lodash";

let _Vue;
let _installed;
const defaultOptions = { title: "name", omit: 1, length: 0, query: {} };

export default class Breadcrumb {
  #options;
  constructor(options) {
    this.#options = { ...defaultOptions, ...options };
  }

  /**
   * 计算通用导航数据
   * @param vm
   * @returns {[]|null}
   */
  getData(vm) {
    // 验证当前是否为路由末尾组件
    let { matched, params, query } = vm?._routerRoot?._route ?? {};
    if (matched?.[matched.length - 1]?.instances.default === vm) {
      matched = matched.slice(this.#options.omit);
      if (this.#options.length > 0) {
        matched = matched.slice(0, length);
      }
      let data = matched.map(route => this.getLocation(route, params, query));
      if (_.isFunction(vm.$options.breadcrumbData)) {
        data = vm.$options.breadcrumbData.call(vm, data);
      }
      return data;
    }
    return null;
  }

  /**
   * 计算导航目标
   * @param route
   * @param routeParams
   * @param routeQuery
   * @returns {{path: string, query: {}, title: any}}
   */
  getLocation(route, routeParams, routeQuery) {
    const title = this.getTitle(route);
    const path = route.path.replace(
      /:([^:/]+)/g,
      (m, p) => routeParams[p] ?? m
    );
    const query = {};
    for (let key in routeQuery) {
      if (Object.prototype.hasOwnProperty.call(routeQuery, key)) {
        let config = this.#options.query[key];
        if (_.isFunction(config)) {
          config = config(route);
        }
        if (_.isArray(config) ? config.includes(route.name) : config) {
          query[key] = routeQuery[key];
        }
      }
    }
    return { title, path, query };
  }

  /**
   * 计算导航标题
   * @param route
   * @returns {string}
   */
  getTitle(route) {
    return _.isFunction(this.#options.title)
      ? this.#options.title(route)
      : _.get(route, this.#options.title);
  }

  /**
   * 导航数据标准化
   * @param vm
   * @param data
   * @returns {[]}
   */
  normalize(vm, data) {
    return data.map((item, level) => {
      if (_.isString(item)) {
        item = { path: item };
      }
      let { title, ...to } = item;
      if (!title && (to.path || to.name)) {
        const route = vm._routerRoot._router.match(to);
        title = this.getTitle(route);
      }
      return { title, to, level };
    });
  }

  /**
   * 更新导航数据
   * @param vm
   * @param data
   */
  update(vm, data) {
    if (_.isArray(data)) {
      vm._routerRoot._breadcrumb = this.normalize(vm, data);
    }
  }

  /**
   * 插件安装函数
   * @param Vue
   * @param options
   * @returns {*[]|Breadcrumb}
   */
  static install(Vue, options) {
    if (_installed && _Vue === Vue) return;
    _installed = true;
    _Vue = Vue;

    const breadcrumb = new Breadcrumb(options);

    Vue.mixin({
      beforeCreate() {
        if (_.isObject(this.$options.router)) {
          Vue.util.defineReactive(this, "_breadcrumb", []);
        }
      },
      created() {
        this.$watch(
          breadcrumb.getData.bind(breadcrumb),
          breadcrumb.update.bind(breadcrumb, this),
          { deep: true, immediate: true }
        );
      }
    });

    Object.defineProperty(Vue.prototype, "$breadcrumb", {
      get() {
        return this._routerRoot._breadcrumb;
      }
    });
  }
}
