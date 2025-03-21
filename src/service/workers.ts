import * as tf from '@tensorflow/tfjs-node';

import { NSFWJS, load } from 'nsfwjs';

import {
  aggregatePrediction,
  mapClassificationsToCategories,
} from './../utils/mapper.js';
import { fetchContent } from './../utils/fetcher.js';

import { ModelType } from './../entity/config.js';

import { ClassificationParam, sortCategories } from './../entity/content.js';
import type { Category } from './../entity/content.js';

let mobilenet: NSFWJS;
let inception: NSFWJS;

const loader = load as (
  src: string,
  cfg: {
    size?: number;
    type?: string;
  }
) => Promise<NSFWJS>;

/**
 * Get MobileNet model to be used for classification
 *
 * @returns {Promise<NSFWJS>} Classifier with MobileNet model
 */
async function getMobileNetModel(): Promise<NSFWJS> {
  if (!mobilenet) {
    const nsfwModel = await loader('file://tfjs-models/mobilenet/', {
      type: 'graph',
    });

    mobilenet = nsfwModel;
  }

  return mobilenet;
}

/**
 * Get MobileNet model to be used for classification
 *
 * @returns {Promise<NSFWJS>} Classifier with MobileNet model
 */
async function getInceptionModel(): Promise<NSFWJS> {
  if (!inception) {
    const nsfwModel = await loader('file://tfjs-models/inception/', {
      size: 299,
    });

    inception = nsfwModel;
  }

  return inception;
}

/**
 * Get NSFWJS model. Will return existing instance if possible
 *
 * @param {ModelType} name model name
 * @returns {Promise<NSFWJS>} NSFWJS model
 */
async function getModel(name: ModelType): Promise<NSFWJS> {
  return name === 'Inception' ? getInceptionModel() : getMobileNetModel();
}

/**
 * Classify image into multiple labels
 *
 * @param {Buffer} buffer image buffer
 * @param {ModelType} modelType NSFW model to be used on classification
 * @returns {Promise<Category[]>} content labels, sorted
 * by descending accuracy.
 */
async function classifyImage(
  buffer: Buffer,
  modelType: ModelType
): Promise<Category[]> {
  const model = await getModel(modelType);

  let predictions = 1;

  if (process.env.NODE_ENV !== 'production') {
    predictions = 5;
  }
  const decodedImage = tf.node.decodeImage(buffer, 3) as tf.Tensor3D;

  const classification = await model.classify(decodedImage, predictions);
  // prevent memory leak
  decodedImage.dispose();

  const categories = mapClassificationsToCategories(classification);

  return sortCategories(categories);
}

/**
 * Classify GIFs into multiple labels
 *
 * @param {Buffer} buffer GIF buffer
 * @param {ModelType} modelType NSFW model to be used on classification
 * @returns {Promise<Category[]>} content labels, sorted
 * by descending accuracy
 */
async function classifyGIF(
  buffer: Buffer,
  modelType: ModelType
): Promise<Category[]> {
  const model = await getModel(modelType);

  const classification = await model.classifyGif(buffer, {
    topk: 1,
  });

  const categories = aggregatePrediction(classification);

  return sortCategories(categories);
}

/**
 * Classify supported contents into multiple labels
 *
 * @param {ClassificationParam} param classification param
 * @returns {Promise<Category[]>} content labels, sorted
 * by descending accuracy
 */
export default async function classify({
  source,
  model,
  content,
}: ClassificationParam): Promise<Category[]> {
  const { mime, data } = await fetchContent(source);

  if (!content.includes(mime)) {
    return [];
  }

  return mime === 'image/gif'
    ? classifyGIF(data, model)
    : classifyImage(data, model);
}
