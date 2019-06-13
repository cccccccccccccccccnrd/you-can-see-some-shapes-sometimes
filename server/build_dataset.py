import os
import sys
import argparse
import re
import string
import nltk

import xml.etree.ElementTree as ET

def build(data_dir):
  def get_filenames():
    for (_, _, filenames) in os.walk(data_dir):
      return filenames
  
  def get_contents(xml_file):
    tree = ET.parse(os.path.join(data_dir, xml_file))
    root = tree.getroot()
    posts = []
    comments = []
    for post in root.iter('item'):
      for post_content in post.iter('{http://purl.org/rss/1.0/modules/content/}encoded'):
        if type(post_content.text) is str:
          posts.append(post_content.text)
      for comment_content in post.iter('{http://wordpress.org/export/1.2/}comment_content'):
        if type(comment_content.text) is str:
          comments.append(comment_content.text)
    return posts, comments
  
  def clean(text):
    # no_tags = re.compile('(<.*?>)|(\\n)|(\\t)|(&.*?;)|([^A-Za-z0-9 ])')
    first = re.compile('(<.*?>)|(&.*?;)|(\\n)|(\\t)|(http.*)')
    second = re.compile('([^A-Za-z0-9\x7f-\xff ])')
    third = re.compile(' {2,}')
    text = first.sub('', text)
    text = second.sub(' ', text)
    text = third.sub(' ', text)

    text = text.lower()
    text = text.translate(string.punctuation)
    return text

  def save(string):
    with open('dataset.txt', 'w+') as f:
      f.write(string)

  dataset = ''
  files = get_filenames()
  for f in files:
    posts, comments = get_contents(f)
    content = ''.join(posts + comments)
    dataset = dataset + content
  
  cleaned = clean(dataset)
  save(cleaned)

def main():
  current_path = os.path.dirname(os.path.realpath(sys.argv[0]))
  parser = argparse.ArgumentParser()
  parser.add_argument(
      '--data_dir',
      type=str,
      default=os.path.join(current_path, 'data'),
      help='The data directory to process Wordpress post exports.')
  flags, unused_flags = parser.parse_known_args()
  build(flags.data_dir)

main()