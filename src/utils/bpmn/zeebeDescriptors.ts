import zeebeModdle from 'zeebe-bpmn-moddle/resources/zeebe.json';

export function getZeebeDescriptors() {
  return zeebeModdle;
}

export const zeebeNamespace = 'http://camunda.org/schema/zeebe/1.0';
