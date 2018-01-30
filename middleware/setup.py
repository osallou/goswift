from setuptools import setup

setup(name='goswiftindex',
    packages=['goswiftindex', ],
    zip_safe=False,
    entry_points={
       'paste.app_factory': ['app=goswiftindex.app:app_factory'],
       'paste.filter_factory': ['middleware = goswiftindex.middleware:filter_factory'],
    },
)
